import {AfterViewInit, Component, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {faMicrophone} from '@fortawesome/free-solid-svg-icons';
import {MicrophoneState} from '../../states/device.service';
import {AzureCognitiveService, AzureCognitiveState} from '../../states/azure-cognitive.service';
import {SpeechRecognizer} from 'microsoft-cognitiveservices-speech-sdk';
import {
  Recognizer,
  SpeechRecognitionEventArgs,
} from 'microsoft-cognitiveservices-speech-sdk/distrib/lib/src/sdk/Exports';
import {TranscriptComponent} from '../transcript/transcript.component';
import {OpenAiService} from '../../states/open-ai.service';
import {ToggleComponent} from '../toggle/toggle.component';
import {ConfigService} from '../../config.service';
import {firstValueFrom, Subscription} from 'rxjs';
import {OpenAiChatPreviewComponent} from '../chat-gpt-preview/open-ai-chat-preview.component';
import {SpeakerService} from '../../states/speaker.service';

@Component({
  selector: 'app-microphone-lane',
  templateUrl: './microphone-lane.component.html',
  styleUrls: ['./microphone-lane.component.scss']
})
export class MicrophoneLaneComponent implements OnInit, OnDestroy {
  private recognizer?: SpeechRecognizer;
  private subscription?: Subscription;

  microphoneIcon = faMicrophone;

  @Input()
  microphone!: MicrophoneState

  @ViewChild('processToggle')
  processToggle?: ToggleComponent

  @ViewChild('enabledToggle')
  enabledToggle?: ToggleComponent

  @ViewChild('transcript')
  transcript?: TranscriptComponent

  @ViewChild(OpenAiChatPreviewComponent)
  openAiChatPreview?: OpenAiChatPreviewComponent;

  enabledMic = false;
  automaticMode = false;
  speakValue = ''

  constructor(private azureCognitive: AzureCognitiveService,
              private config: ConfigService,
              private speaker: SpeakerService,
              private openAI: OpenAiService) {
  }

  ngOnInit() {
    const enabled = this.config.get<boolean>(this.getEnabledKey())
    if (enabled !== null) {
      this.enabledMic = enabled;
      if (enabled) {
        this.startListening()
      }
    }
    const mode = this.config.get<boolean>(this.getModeKey())
    if (mode !== null) {
      this.automaticMode = mode;
    }
  }

  toggleMode(enabled: boolean) {
    this.config.save(this.getModeKey(), enabled)
    this.automaticMode = enabled;
  }

  toggleMicrophone(enabled: boolean) {
    if (enabled) {
      this.startListening()
    } else if (this.recognizer) {
      this.recognizer.stopContinuousRecognitionAsync()
      this.recognizer.close()
    }

    this.config.save(this.getEnabledKey(), enabled)
  }

  private async startListening() {
    const state = await firstValueFrom(this.azureCognitive.state$)
    if (!state.speechConfig) {
      return;
    }

    const recognizer = this.azureCognitive.listen(state.speechConfig, this.microphone.deviceId);
    recognizer.recognized = (sender: Recognizer, event: SpeechRecognitionEventArgs) => {
      if (!event.result.text || !this.transcript) {
        return
      }

      this.transcript.value += `${event.result.text}\n`;

      if (this.automaticMode) {
        this.processOpenAI()
      }
    }
    this.recognizer = recognizer;
  }

  private getEnabledKey() {
    return `${this.microphone.deviceId}-listening`;
  }
  private getModeKey() {
    return `${this.microphone.deviceId}-mode`;
  }

  transcriptChanged(script: string) {
    if (this.microphone.mode === 'OpenAI') {
      this.processOpenAI()
    } else {
      this.speakValue = script;
    }
  }

  async processOpenAI() {
    const value = this.transcript?.value;
    if (!value) {
      return
    }

    if (!this.openAiChatPreview) {
      return
    }

    const result = await this.openAI.push(this.microphone.name, value)
    if (!result) {
      return;
    }
    this.openAiChatPreview.value = result;
    this.speakValue = result;
  }

  ngOnDestroy() {
    this.recognizer?.close();
    this.subscription?.unsubscribe();
  }
}
