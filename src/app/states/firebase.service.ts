import { Injectable } from '@angular/core';
import { ConfigService } from '../config.service';
import { BehaviorSubject, combineLatest, mergeMap, shareReplay} from 'rxjs';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import { FirebaseApp, FirebaseError, FirebaseOptions, deleteApp, initializeApp } from "firebase/app";
import {
   getFirestore,
   getDoc,
   updateDoc,
   Firestore,
   collection,
   addDoc,
   doc,
   setDoc,
   getDocs,
   deleteDoc,
   runTransaction
} from 'firebase/firestore/lite';
import { User, browserLocalPersistence, getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

const DEFAULT_API_KEY = 'AIzaSyCbsk8PYE8siL58giIaDG1BjXLmtNWPjSY';
const DEFAULT_APP_ID = '1:949850774703:web:67bc87b614929fed3a085a';
const DEFAULT_PROJECT_ID = 'chandalair-8bf5b';
const DEFAULT_EMAIL = '';

export interface FirebaseSettings {
  apiKey: string;
  appId: string;
  projectId: string;
  email: string;
  password: string;
}

export interface FirebaseState {
  ready: boolean;
  canLogin: boolean;
  settings: FirebaseSettings;
  // user: User | null;
}

export interface Config {
  azureApiKey: string;
  azureRegion: string;
  openaiApiKey: string;
}

export type LoginState = 'load' | 'init' | 'login' | 'success' | 'failure' | 'out';
export type CostSource = 'openai';

function removeUndefined(d: any): any {
  if (Array.isArray(d)) {
    return d.filter(x => 'undefined' !== typeof x).map(removeUndefined);
  }
  if (d !== null && 'object' === typeof d) {
    return Object.fromEntries(
      Object.entries(d).filter(([k, v]) => 'undefined' !== typeof v).map(([k, v]) => [k, removeUndefined(v)])
    );
  }
  return d;
}

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private configApiKey = 'firebase-api-key';
  private configAppIdKey = 'firebase-app-id';
  private configProjectIdKey = 'firebase-project-id';
  private emailKey = 'firebase-email';

  private costCollection = 'cost';
  private totalsPath = 'info/totals';
  private configPath = 'info/config';
  private conversationCollection = 'conversation';
  private prerecordingsCollection = 'prerecordings';

  loginState = new BehaviorSubject<LoginState>('load');
  error = new BehaviorSubject<string>('');
  password = new BehaviorSubject<string>('');
  private uuid: string|null = null;

  app: FirebaseApp|null = null;
  firestore: Firestore|null = null;

  prerecordings = new BehaviorSubject<string[]|null>(null);

  state$ = combineLatest([
    this.config.watch<string>(this.configApiKey, DEFAULT_API_KEY),
    this.config.watch<string>(this.configAppIdKey, DEFAULT_APP_ID),
    this.config.watch<string>(this.configProjectIdKey, DEFAULT_PROJECT_ID),
    this.config.watch<string>(this.emailKey, DEFAULT_EMAIL),
    this.password,
    this.loginState,
  ]).pipe(
    mergeMap(([apiKey, appId, projectId, email, password, loginState]) =>
      fromPromise(this.mapState(apiKey ?? '', appId ?? '', projectId ?? '', email ?? '', password ?? '', loginState)),
    ),
    shareReplay(),
  );

  constructor(private config: ConfigService) {}

  setApiKey(apiKey: string) {
    this.config.save(this.configApiKey, apiKey);
  }
  setAppId(appId: string) {
    this.config.save(this.configAppIdKey, appId);
  }
  setProjectId(projectId: string) {
    this.config.save(this.configProjectIdKey, projectId);
  }
  setEmail(email: string) {
    this.config.save(this.emailKey, email);
  }
  setPassword(password: string) {
    this.password.next(password);
  }

  doLogin() {
    this.loginState.next('login');
  }
  async doLogout() {
    await signOut(getAuth());
    this.loginState.next('out');
  }

  private getPath(path: string) {
    return `users/${this.uuid}/${path}`;
  }

  private async initSchema() {
    // Is there a better pattern for this?
    const totalsRef = await doc(this.firestore!, this.getPath(this.totalsPath));
    const totalsSnapshot = await getDoc(totalsRef);
    if (!totalsSnapshot.exists()) {
      setDoc(totalsRef, {created: Date.now(), cost: 0});
    }
  }

  async addCost(cost: number, source: CostSource) {
    if (this.loginState.value != 'success') {
      return;
    }
    const costCol = collection(this.firestore!, this.getPath(this.costCollection));
    const t = Date.now();
    await addDoc(costCol, {t, cost, source});
    // Can this be done in an atomic transaction?
    const totalsRef = await doc(this.firestore!, this.getPath(this.totalsPath));
    const totals = (await getDoc(totalsRef)).data() ?? {};
    await updateDoc(totalsRef, {...totals, t, cost: (totals['cost'] || 0) + cost});
  }

  async getTotalCost() : Promise<number | null> {
    if (this.loginState.value != 'success') {
      return null;
    }
    const totals = (await getDoc(await doc(this.firestore!, this.getPath(this.totalsPath)))).data() ?? {};
    return totals['cost'] as number;
  }

  async getConfig() : Promise<Config|null> {
    if (this.loginState.value != 'success') {
      return null;
    }
    try {
      const config = (await getDoc(await doc(this.firestore!, this.getPath(this.configPath)))).data() ?? {};
      if (!config['azureApiKey'] || !config['azureRegion'] || !config['openaiApiKey']) {
        // TODO better error handling (currently it's overwritten).
        console.error('Got invalid config', this.uuid, config);
        this.error.next('Invalid config');
        return null;
      }
      return config as Config;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async setConversation(id: string, conversation: any) {
    if (this.loginState.value != 'success') {
      return;
    }
    const docRef = await doc(this.firestore!, this.getPath(`${this.conversationCollection}/${id}`));
    conversation = removeUndefined(conversation);
    await setDoc(docRef, {conversation});
  }

  async mergePrerecordings(recordings: string[]) {
    recordings = [...new Set(recordings)];
    if (this.loginState.value != 'success') {
      return;
    }
    await runTransaction(this.firestore!, async (transaction) => {
      const coll = collection(this.firestore!, this.getPath(this.prerecordingsCollection));
      const docs = await getDocs(coll);
      const existingRecordings = docs.docs.map(doc => doc.data()['content']);
      const newRecordings = recordings.filter(r => !existingRecordings.includes(r));
      newRecordings.forEach(content => {
        transaction.set(doc(coll), {content});
      });
    });
  }

  async deletePrerecording(recording: string) {
    if (this.loginState.value != 'success') {
      return;
    }
    const coll = collection(this.firestore!, this.getPath(this.prerecordingsCollection));
    const promises: Promise<void>[] = [];
    (await getDocs(coll)).forEach(doc => {
      if (recording === doc.data()['content']) {
        promises.push(deleteDoc(doc.ref));
      }
    });
    await Promise.all(promises);
  }

  private async loadPrerecordings() {
    const coll = collection(this.firestore!, this.getPath(this.prerecordingsCollection));
    const docs: string[] = [];
    (await getDocs(coll)).forEach(doc => {
      docs.push(doc.data()['content'] as string);
    });
    this.prerecordings.next(docs);
  }

  private initializeFirebase(apiKey: string, appId: string, projectId: string) {
    // Note: this will never fail, even if provided values are invalid.
    const firebaseConfig = {
      apiKey,
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: `${projectId}.appspot.com`,
      messagingSenderId: appId!.split(':')[1],
      appId,
    };
    if (this.app) {
      deleteApp(this.app);
    }
    this.app = initializeApp(firebaseConfig as FirebaseOptions);
    this.firestore = getFirestore(this.app);
    getAuth().onAuthStateChanged((user: User|null) => {
      console.log('onAuthStateChanged', user);
      if (user) {
        this.uuid = user.uid;
        this.initSchema();
        this.loadPrerecordings();
        this.loginState.next('success');
        this.setEmail(user.email ?? '');
      }
    });
  }

  private async firestoreLogin(settings: FirebaseSettings) {
    const {apiKey, appId, projectId, email, password} = settings;
    // Need to re-initialize firebae because some parameter could have changed.
    this.initializeFirebase(apiKey, appId, projectId);
    this.error.next('');
    try {
      const auth = getAuth()
      await auth.setPersistence(browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.log('firebase login failure', err);
      this.error.next('Could not login: ' + (err as FirebaseError).message);
      this.loginState.next('failure');
    }
  }

  async mapState(
    apiKey: string,
    appId: string,
    projectId: string,
    email: string,
    password: string,
    loginState: LoginState,
  ): Promise<FirebaseState> {

    const settings: FirebaseSettings = {apiKey, appId, projectId, email, password};

    if (loginState === 'load') {
      if (apiKey && appId && projectId) {
        console.log('-> init');
        this.initializeFirebase(apiKey, appId, projectId);
        this.loginState.next('init');
      }
    }

    if (loginState === 'login') {
      this.firestoreLogin(settings);
    }

    if (loginState === 'success') {
      this.error.next('');
    }

    return {
      ready: loginState === 'success',
      canLogin: true,
      settings,
    };
  }
}
