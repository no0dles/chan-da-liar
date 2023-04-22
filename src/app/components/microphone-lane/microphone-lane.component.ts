import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {MicrophoneState} from '../../states/device.service';
import {AzureCognitiveService} from '../../states/azure-cognitive.service';
import {OutputFormat, SpeechRecognizer} from 'microsoft-cognitiveservices-speech-sdk';
import {
  Recognizer,
  SpeechRecognitionEventArgs,
} from 'microsoft-cognitiveservices-speech-sdk/distrib/lib/src/sdk/Exports';
import {ToggleComponent} from '../toggle/toggle.component';
import {firstValueFrom, Observable, ReplaySubject, Subscription} from 'rxjs';
import {OpenAiChatPreviewComponent} from '../chat-gpt-preview/open-ai-chat-preview.component';
import {ConversationRole} from '../../states/conversation.service';

export interface OngoingRecogniztion {
  messageId: number;
  partId: number
  text$: Observable<string>
  completed: false
  textPrefix?: string
  role: ConversationRole;
}

export interface CompleteRecogniztion {
  messageId: number;
  partId: number
  text: string
  completed: true;
  textPrefix?: string
  role: ConversationRole;
}

export type TextRecogniztion = CompleteRecogniztion | OngoingRecogniztion;

export interface RecongniztionState {
  messageStartedAt: number
  partStartedAt: number;
  updateSubject: ReplaySubject<string>
}

@Component({
  selector: 'app-microphone-lane',
  templateUrl: './microphone-lane.component.html',
  styleUrls: ['./microphone-lane.component.scss'],
})
export class MicrophoneLaneComponent implements OnInit, OnDestroy {
  private recognizer?: SpeechRecognizer;
  private subscription?: Subscription;

  @Output()
  spoke = new EventEmitter<TextRecogniztion>();

  @Input()
  microphone!: MicrophoneState;

  @ViewChild('enabledToggle')
  enabledToggle?: ToggleComponent;

  @ViewChild(OpenAiChatPreviewComponent)
  openAiChatPreview?: OpenAiChatPreviewComponent;

  enabledMic = false;

  private state: RecongniztionState | null = null;

  constructor(
    private azureCognitive: AzureCognitiveService,
  ) {}

  ngOnInit() {

  }

  toggleMicrophone(enabled: boolean) {
    if (enabled) {
      this.startListening();
    } else if (this.recognizer) {
      this.recognizer.stopContinuousRecognitionAsync();
      this.recognizer.close();
    }
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

    recognizer.recognizing = (
      sender: Recognizer,
      event: SpeechRecognitionEventArgs,
    ) => {
      console.log('recognizing on ' + this.microphone.deviceName)
      const text = event.result.text;
      if (!text) {
        return;
      }

      if (this.state) {
        this.updateMessage(this.state, text)
      } else {
        this.state = this.createState()
        this.state.updateSubject.next(text)

        this.spoke.emit({
          completed: false,
          text$: this.state.updateSubject.asObservable(),
          textPrefix: this.microphone.prefix,
          messageId: this.state.messageStartedAt,
          partId: this.state.partStartedAt,
          role: 'user',
        })
      }
    };

    recognizer.recognized = (
      sender: Recognizer,
      event: SpeechRecognitionEventArgs,
    ) => {
      console.log('recognized on ' + this.microphone.deviceName)
      if (!event.result.text) {
        return;
      }

      if (this.state) {
        this.completeMessage(this.state, event.result.text)
      } else {
        this.state = this.createState();
        this.completeMessage(this.state, event.result.text)
      }
    };
    this.recognizer = recognizer;
  }

  private updateMessage(state: RecongniztionState, text: string) {
    console.log(text)
    const cs = Date.now() - state.partStartedAt > 1000 ? '?!.,-' : '?!.';
    for (const c of cs) {
      const i = text.lastIndexOf(c);
      if (i !== -1) {
        this.completePart(state, text.substring(0, i + 1), text.substring(i + 1))
      }
    }
    state.updateSubject.next(text)
  }

  private completePart(state: RecongniztionState, text: string, openText: string) {
    this.spoke.emit({
      completed: true,
      text,
      textPrefix: this.microphone.prefix,
      messageId: state.messageStartedAt,
      partId: state.partStartedAt,
      role: 'user',
    })

    state.partStartedAt = Date.now();
    state.updateSubject.next(openText)
    this.spoke.emit({
      completed: false,
      text$: state.updateSubject,
      textPrefix: this.microphone.prefix,
      messageId: state.messageStartedAt,
      partId: state.partStartedAt,
      role: 'user',
    })
  }

  private completeMessage(state: RecongniztionState, text: string) {
    this.spoke.emit({
      completed: true,
      textPrefix: this.microphone.prefix,
      text: text,
      messageId: state.messageStartedAt,
      partId: state.partStartedAt,
      role: 'user',
    })

    this.state = null;
  }

  private createState(): RecongniztionState {
    return {
      messageStartedAt: Date.now(),
      partStartedAt: Date.now(),
      updateSubject: new ReplaySubject<string>(),
    }
  }

  ngOnDestroy() {
    this.recognizer?.close();
    this.subscription?.unsubscribe();
  }
}
