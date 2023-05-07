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
import {BehaviorSubject, combineLatest, mergeMap, shareReplay} from 'rxjs';
import { fromPromise } from 'rxjs/internal/observable/innerFrom';
import { Cache } from '../utils/cache';
import { FirebaseService } from './firebase.service';

export interface AzureCognitiveSettings {
  apiKey: string;
  region: string;
}

export interface AzureCognitiveState {
  speechConfig: SpeechConfig | null;
  settings: AzureCognitiveSettings | null;
  managed: boolean;
  voices: VoiceInfo[];
  localeVoices: VoiceInfo[];
  locales: string[];
  selectedLocale: string | null;
  selectedVoice: VoiceInfo | null;
  ready: boolean;
  error: string | null;
}

export interface SpeakResult {
  duration: number
  visums: SpeakVisum[];
}

export interface SpeakVisum {
  value: number
  offset: number;
}

// const options = {
//   host: '172.16.23.15'
// }

//const artnet = require('artnet')(options);
// set channel 1 to 255 and disconnect afterwards.
//         artnet.set(1, 255, function (err, res) {
//           artnet.close();
//         });

@Injectable({
  providedIn: 'root',
})
export class AzureCognitiveService {
  private configApiKey = 'azure-cognitive-key';
  private configRegionKey = 'azure-cognitive-region';
  private configLocaleKey = 'azure-cognitive-locale';
  private configVoiceKey = 'azure-cognitive-voice';

  private voiceCache = new Cache<VoiceInfo[]>();
  private speechCache = new Cache<SpeechConfig>();

  private managedSettings = new BehaviorSubject<AzureCognitiveSettings|null>(null);
  state$ = combineLatest([
    this.config.watch<string>(this.configApiKey),
    this.config.watch<string>(this.configRegionKey),
    this.config.watch<string>(this.configLocaleKey),
    this.config.watch<string>(this.configVoiceKey),
    this.managedSettings,
  ]).pipe(
    mergeMap(([apiKey, region, locale, voice, managedSettings]) =>
      fromPromise(this.mapState(apiKey, region, locale, voice, managedSettings)),
    ),
    shareReplay(),
  );

  constructor(private config: ConfigService, firebase: FirebaseService) {
    firebase.loginState.subscribe(async (loginState) => {
      if (loginState === 'success') {
        const config = await firebase.getConfig();
        if (config) {
          this.managedSettings.next({
            apiKey: config.azureApiKey,
            region: config.azureRegion,
          });
        }
      } else {
        this.managedSettings.next(null);
      }
    })
  }

  setApiKey(key: string) {
    this.config.save(this.configApiKey, key);
  }

  setRegion(key: string) {
    this.config.save(this.configRegionKey, key);
  }

  setLocale(locale: string) {
    this.config.save(this.configLocaleKey, locale);
  }

  setVoice(voice: string) {
    this.config.save(this.configVoiceKey, voice);
  }

  async mapState(
    apiKey: string | null,
    region: string | null,
    locale: string | null,
    voice: string | null,
    managedSettings: AzureCognitiveSettings | null,
  ): Promise<AzureCognitiveState> {
    console.log('map azure')
    if (!apiKey || !region) {
      return {
        settings: null,
        managed: false,
        speechConfig: null,
        locales: [],
        voices: [],
        localeVoices: [],
        ready: false,
        selectedLocale: null,
        selectedVoice: null,
        error: null,
      };
    }

    if (managedSettings) {
      apiKey = managedSettings.apiKey;
      region = managedSettings.region;
    }
    const cacheKey = `${apiKey}-${region}`;
    const api: AzureCognitiveSettings = { apiKey, region };
    let error = ''
    const voices = await this.voiceCache.getOrCreate(cacheKey, () =>
      this.getVoices(api).catch(err => {
        error = 'Failed to load voices'
        console.error(err);
        return [];
      }),
    );

    const locales = voices.reduce<string[]>((locales, voice) => {
      if (locales.indexOf(voice.locale) === -1) {
        locales.push(voice.locale);
      }
      return locales;
    }, []);

    const selectedLocale =
      locale ?? locales.find((l) => l === navigator.language) ?? null;
    const selectedVoice = voices.find((v) => v.name === voice) ?? null;
    const localeVoices = voices.filter((v) => v.locale === selectedLocale);

    const speechConfig = await this.speechCache.getOrCreate(cacheKey, () => {
      const speechConfig = SpeechConfig.fromSubscription(
        api.apiKey,
        api.region,
      );
      speechConfig.outputFormat = OutputFormat.Detailed;
      speechConfig.speechSynthesisOutputFormat =
        SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
      return speechConfig;
    });

    if (selectedVoice) {
      speechConfig.speechSynthesisVoiceName = selectedVoice.name;
    }

    if (selectedLocale) {
      speechConfig.speechRecognitionLanguage = selectedLocale;
    }

    return {
      selectedVoice,
      selectedLocale,
      voices,
      locales,
      localeVoices,
      ready: !!selectedVoice && !!selectedLocale,
      settings: api,
      managed: !!managedSettings,
      speechConfig,
      error,
    };
  }

  async getVoices(settings: AzureCognitiveSettings) {
    const speech = SpeechConfig.fromSubscription(
      settings.apiKey,
      settings.region,
    );
    const synthAudio = AudioConfig.fromDefaultSpeakerOutput();
    const synth = new SpeechSynthesizer(speech, synthAudio);
    const result = await synth.getVoicesAsync();
    if (result.errorDetails) {
      throw new Error(result.errorDetails)
    }
    return result.voices ?? [];
  }

  async speak(
    speechConfig: SpeechConfig,
    deviceId: string,
    text: string,
  ): Promise<SpeakResult> {
    const player = new SpeakerAudioDestination(deviceId);
    const synthAudio = AudioConfig.fromSpeakerOutput(player);
    const synth = new SpeechSynthesizer(speechConfig, synthAudio);
    return new Promise<SpeakResult>((resolve) => {
      const visums: SpeakVisum[] = [];
      synth.visemeReceived = (sender, e) => {
        visums.push({value: e.visemeId, offset: e.audioOffset / 10000 })
      }
      synth.speakTextAsync(text, (e) => {
        resolve({duration: e.audioDuration / 10000, visums }); // ticks to ms
      });
    });
  }

  listen(speechConfig: SpeechConfig, deviceId: string) {
    const defaultMic = AudioConfig.fromMicrophoneInput(deviceId);
    const recognizer = new SpeechRecognizer(speechConfig, defaultMic);
    recognizer.startContinuousRecognitionAsync();
    return recognizer;
  }
}
