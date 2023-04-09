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
import {
  Recognizer,
  SpeechRecognitionEventArgs,
} from 'microsoft-cognitiveservices-speech-sdk/distrib/lib/src/sdk/Exports';

export interface AzureCognitiveSettings {
  apiKey: string;
  region: string;
}

export interface AzureCognitiveState {
  speechConfig: SpeechConfig | null;
  settings: AzureCognitiveSettings | null;
  voices: VoiceInfo[];
  localeVoices: VoiceInfo[];
  locales: string[];
  selectedLocale: string | null;
  selectedVoice: VoiceInfo | null;
  ready: boolean;
  error: string | null
}

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

  state$ = combineLatest([
    this.config.watch<string>(this.configApiKey),
    this.config.watch<string>(this.configRegionKey),
    this.config.watch<string>(this.configLocaleKey),
    this.config.watch<string>(this.configVoiceKey),
  ]).pipe(
    mergeMap(([apiKey, region, locale, voice]) =>
      fromPromise(this.mapState(apiKey, region, locale, voice)),
    ),
    shareReplay(),
  );

  constructor(private config: ConfigService) {}

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
  ): Promise<AzureCognitiveState> {
    if (!apiKey || !region) {
      return {
        settings: null,
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
  ): Promise<number> {
    const player = new SpeakerAudioDestination(deviceId);
    const synthAudio = AudioConfig.fromSpeakerOutput(player);
    const synth = new SpeechSynthesizer(speechConfig, synthAudio);
    return new Promise<number>((resolve) => {
      synth.speakTextAsync(text, (e) => {
        resolve(e.audioDuration / 10000); // ticks to ms
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
