import {
  Component, EventEmitter,
  Input,
  OnDestroy,
  OnInit, Output,
  ViewChild,
} from '@angular/core';
import { faMicrophone } from '@fortawesome/free-solid-svg-icons';
import { MicrophoneState } from '../../states/device.service';
import { AzureCognitiveService } from '../../states/azure-cognitive.service';
import { SpeechRecognizer } from 'microsoft-cognitiveservices-speech-sdk';
import {
  Recognizer,
  SpeechRecognitionEventArgs,
} from 'microsoft-cognitiveservices-speech-sdk/distrib/lib/src/sdk/Exports';
import { TranscriptComponent } from '../transcript/transcript.component';
import { ToggleComponent } from '../toggle/toggle.component';
import { ConfigService } from '../../config.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { OpenAiChatPreviewComponent } from '../chat-gpt-preview/open-ai-chat-preview.component';
import { SpeakerService } from '../../states/speaker.service';

@Component({
  selector: 'app-microphone-lane',
  templateUrl: './microphone-lane.component.html',
  styleUrls: ['./microphone-lane.component.scss'],
})
export class MicrophoneLaneComponent implements OnInit, OnDestroy {
  private recognizer?: SpeechRecognizer;
  private subscription?: Subscription;

  microphoneIcon = faMicrophone;

  @Output()
  spoke = new EventEmitter<string>();

  @Output()
  speaking = new EventEmitter<string>();

  @Input()
  microphone!: MicrophoneState;

  @ViewChild('enabledToggle')
  enabledToggle?: ToggleComponent;

  @ViewChild(OpenAiChatPreviewComponent)
  openAiChatPreview?: OpenAiChatPreviewComponent;

  enabledMic = false;
  automaticMode = false;
  speakValue: string[] = [];

  constructor(
    private azureCognitive: AzureCognitiveService,
    private config: ConfigService,
  ) {}

  ngOnInit() {
    const mode = this.config.get<boolean>(this.getModeKey());
    if (mode !== null) {
      this.automaticMode = mode;
    }
  }

  toggleMode(enabled: boolean) {
    this.config.save(this.getModeKey(), enabled);
    this.automaticMode = enabled;
  }

  toggleMicrophone(enabled: boolean) {
    if (enabled) {
      this.startListening();
      // navigator.mediaDevices.getUserMedia({audio: {deviceId: this.microphone.deviceId}}).then(stream => {
      //   this.speaker.stream(stream);
      // })
    } else if (this.recognizer) {
      this.recognizer.stopContinuousRecognitionAsync();
      this.recognizer.close();
    }

    this.config.save(this.getEnabledKey(), enabled);
  }

  private async startListening() {
    console.log('listening on ' + this.microphone.deviceName)
    const state = await firstValueFrom(this.azureCognitive.state$);
    if (!state.speechConfig) {
      console.warn('no speech config')
      return;
    }

    const recognizer = await this.azureCognitive.listen(
      state.speechConfig,
      this.microphone.deviceId,
    );

    // const synthesizer = new SpeechSynthesizer(
    //   this.speechConfig, download ? null : audioConfig);
    // synthesizer.visemeReceived = (sender, evt) => {
    //   sender.
    // }

    recognizer.recognizing = (
      sender: Recognizer,
      event: SpeechRecognitionEventArgs,
    ) => {
      console.log('recognizing on', this.microphone.deviceName, ':', event.result.text);
      if (!event.result.text) {
        return;
      }

      this.speaking.emit(event.result.text)
    };

    recognizer.recognized = (
      sender: Recognizer,
      event: SpeechRecognitionEventArgs,
    ) => {
      console.log('recognized on ' + this.microphone.deviceName)
      if (!event.result.text) {
        return;
      }

      this.spoke.emit(event.result.text)
    };

    this.recognizer = recognizer;
  }

  private getEnabledKey() {
    return `${this.microphone.deviceId}-listening`;
  }
  private getModeKey() {
    return `${this.microphone.deviceId}-mode`;
  }

  ngOnDestroy() {
    this.recognizer?.close();
    this.subscription?.unsubscribe();
  }
}
