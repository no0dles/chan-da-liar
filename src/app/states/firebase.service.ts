import { Injectable } from '@angular/core';
import { ConfigService } from '../config.service';
import {
  OutputFormat,
  AudioConfig,
  SpeechRecognizer,
  SpeechConfig,
  SpeechSynthesisOutputFormat,
  SpeechSynthesizer,
  VoiceInfo,
  SpeakerAudioDestination,
} from 'microsoft-cognitiveservices-speech-sdk';
import {catchError, combineLatest, mergeMap, shareReplay} from 'rxjs';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import { Cache } from '../utils/cache';

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
  settings: FirebaseSettings;
}

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private configApiKey = 'firebase-api-key';
  private configAppIdKey = 'firebase-app-id';
  private configProjectIdKey = 'firebase-project-id';
  private emailKey = 'firebase-email';
  private passwordKey = 'firebase-password';

  state$ = combineLatest([
    this.config.watch<string>(this.configApiKey, DEFAULT_API_KEY),
    this.config.watch<string>(this.configAppIdKey, DEFAULT_APP_ID),
    this.config.watch<string>(this.configProjectIdKey, DEFAULT_PROJECT_ID),
    this.config.watch<string>(this.emailKey, DEFAULT_EMAIL),
    this.config.watch<string>(this.passwordKey),
  ]).pipe(
    mergeMap(([apiKey, appId, projectId, email, password]) =>
      fromPromise(this.mapState(apiKey, appId, projectId, email, password)),
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

  async mapState(
    apiKey: string | null,
    appId: string | null,
    projectId: string | null,
    email: string | null,
    password: string | null,
  ): Promise<FirebaseState> {
    console.log('map firebase');

    if (!apiKey || !appId || !projectId || !email || !password) {
      return {
        ready: false,
        settings: {apiKey, appId, projectId, email, password},
      }
    }

    // const firebaseConfig = {
    //   apiKey,
    //   authDomain: `${projectId}.firebaseapp.com`,
    //   projectId,
    //   storageBucket: `${projectId}.appspot.com`,
    //   messagingSenderId: appId.split(':')[1],
    //   appId,
    // };
    // const app = initializeApp(firebaseConfig);
    // const analytics = getAnalytics(app);

    return {
      ready: true,
      settings: {apiKey, appId, projectId, email, password},
    };
  }
}
