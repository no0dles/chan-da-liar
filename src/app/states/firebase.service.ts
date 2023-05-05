import { Injectable } from '@angular/core';
import { ConfigService } from '../config.service';
import { BehaviorSubject, Observable, combineLatest, firstValueFrom, mergeMap, shareReplay} from 'rxjs';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import { FirebaseError, FirebaseOptions, initializeApp } from "firebase/app";
import {
   getFirestore,
   getDoc,
   updateDoc,
   Firestore
} from 'firebase/firestore/lite';
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

const DEFAULT_API_KEY = 'AIzaSyCbsk8PYE8siL58giIaDG1BjXLmtNWPjSY';
const DEFAULT_APP_ID = '1:949850774703:web:67bc87b614929fed3a085a';
const DEFAULT_PROJECT_ID = 'chandalair-8bf5b';
const DEFAULT_EMAIL = 'moshi.na.vioo@gmail.com'

export interface FirebaseSettings {
  apiKey: string | null;
  appId: string | null;
  projectId: string | null;
  email: string | null;
  password: string | null;
}

export interface FirebaseState {
  ready: boolean;
  canLogin: boolean;
  settings: FirebaseSettings;
}

type LoginState = 'out' | 'ongoing' | 'success' | 'failure';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private configApiKey = 'firebase-api-key';
  private configAppIdKey = 'firebase-app-id';
  private configProjectIdKey = 'firebase-project-id';
  private emailKey = 'firebase-email';
  private passwordKey = 'firebase-password';

  private onLoad = true;

  loginState = new BehaviorSubject<LoginState>('out');
  error = new BehaviorSubject<string>('');

  firestore: Firestore | null = null;

  state$ = combineLatest([
    this.config.watch<string>(this.configApiKey, DEFAULT_API_KEY),
    this.config.watch<string>(this.configAppIdKey, DEFAULT_APP_ID),
    this.config.watch<string>(this.configProjectIdKey, DEFAULT_PROJECT_ID),
    this.config.watch<string>(this.emailKey, DEFAULT_EMAIL),
    this.config.watch<string>(this.passwordKey),
    this.loginState
  ]).pipe(
    mergeMap(([apiKey, appId, projectId, email, password, loginState]) =>
      fromPromise(this.mapState(apiKey, appId, projectId, email, password, loginState)),
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
    this.config.save(this.passwordKey, password);
  }

  doLogin() {
    this.loginState.next('ongoing');
  }

  private async doFirestoreLogin(settings: FirebaseSettings) {
    this.error.next('');

    const {apiKey, projectId, appId, email, password} = settings;

    const firebaseConfig = {
      apiKey,
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: `${projectId}.appspot.com`,
      messagingSenderId: appId!.split(':')[1],
      appId,
    };
    try {
      const app = initializeApp(firebaseConfig as FirebaseOptions);
      this.firestore = getFirestore(app);
      const creds = await signInWithEmailAndPassword(getAuth(), email ?? '', password ?? '');
      console.log('creds', creds);
      this.loginState.next('success');
    } catch (err) {
      console.log('firebase login failure', err);
      this.error.next((err as FirebaseError).message);
      this.loginState.next('failure');
    }
  }

  async doLogout() {
    signOut(getAuth());
    this.loginState.next('out');
  }

  async mapState(
    apiKey: string | null,
    appId: string | null,
    projectId: string | null,
    email: string | null,
    password: string | null,
    loginState: LoginState,
  ): Promise<FirebaseState> {

    const settings: FirebaseSettings = {apiKey, appId, projectId, email, password};
    const canLogin = apiKey && appId && projectId && email && password;

    if (canLogin && this.onLoad && loginState === 'out') {
      this.loginState.next('ongoing');
    }
    if (loginState === 'ongoing') {
      this.doFirestoreLogin(settings);
    }

    this.onLoad = false;
    return {
      ready: loginState === 'success',
      canLogin: true,
      settings,
    };
  }
}
