import { WaveFile } from 'wavefile';
import {
  AudioConfig,
  AudioInputStream, SpeechConfig,
  SpeechRecognizer, SpeechSynthesizer,
} from 'microsoft-cognitiveservices-speech-sdk';
import config from 'config';
import { clearTimeout } from 'node:timers';

export interface SpeakVisum {
  value: number;
  offset: number;
}

export function getAudio(speechConfig: SpeechConfig, text: string) {
  const visums: SpeakVisum[] = [];
  const synth = new SpeechSynthesizer(speechConfig);

  return new Promise<{ audio: ArrayBuffer, text: string, visums: SpeakVisum[] }>((resolve, reject) => {

    synth.visemeReceived = (sender, e) => {
      visums.push({ value: e.visemeId, offset: e.audioOffset / 10000 });
    };
    synth.speakTextAsync(text, e => {
      resolve({
        audio: e.audioData,
        text,
        visums,
      })
    }, err => {
      console.error(err)
      reject(err)
    });
  })
}

export function getTranscription(speechConfig: SpeechConfig, data: Int16Array) {
  const wav = new WaveFile();
  wav.fromScratch(1, 16000, "16", data)

  const audioStream = AudioInputStream.createPushStream()
  audioStream.write(wav.toBuffer());
  audioStream.close()

  const audioConfig = AudioConfig.fromStreamInput(audioStream);
  const recognizer = new SpeechRecognizer(speechConfig, audioConfig);

  return new Promise<string | null>((resolve, reject) => {
    let timeout = setTimeout(() => {
      resolve(null)
      recognizer.close()
    }, config.get<number>('speakRecognitionTimeout'));

    recognizer.recognized = (s, e) => {
      clearTimeout(timeout)

      if (e.result.text) {
        resolve(e.result.text)
      } else {
        resolve(null)
      }

      recognizer.close()
    }

    recognizer.startContinuousRecognitionAsync()
  })
}
