import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {MicrophoneState} from '../../states/device.service';
import {AzureCognitiveService} from '../../states/azure-cognitive.service';
import {SpeechRecognizer} from 'microsoft-cognitiveservices-speech-sdk';
import {
  Recognizer,
  SpeechRecognitionEventArgs,
} from 'microsoft-cognitiveservices-speech-sdk/distrib/lib/src/sdk/Exports';
import {ToggleComponent} from '../toggle/toggle.component';
import {firstValueFrom, Subscription} from 'rxjs';
import { createOngoingRecognizer, OngoingRecognizer, OngoingRecognition } from '../../states/ongoing-recognizer';
import { KeyboardService } from 'src/app/keyboard';

@Component({
  selector: 'app-microphone-lane',
  templateUrl: './microphone-lane.component.html',
  styleUrls: ['./microphone-lane.component.scss'],
})
export class MicrophoneLaneComponent implements OnInit, OnDestroy {
  private speechRecognizer?: SpeechRecognizer;
  private ongoingRecognizer: OngoingRecognizer | null = null;
  private subscription?: Subscription;

  @Output()
  spoke = new EventEmitter<OngoingRecognition>();

  @Input()
  microphone!: MicrophoneState;

  @Input()
  index!: number;

  @ViewChild('enabledToggle')
  enabledToggle?: ToggleComponent;
  enabledMic = false;


  constructor(
    private azureCognitive: AzureCognitiveService,
    private keyboard: KeyboardService,
  ) {
  }

  private callbackId = -1;
  ngOnInit() {
    this.callbackId = this.keyboard.registerExclusive('Digit' + (this.index + 1), () => this.enabledToggle?.toggle());
  }

  toggleMicrophone(enabled: boolean) {
    if (enabled) {
      this.startListening();
    } else if (this.speechRecognizer) {
      this.speechRecognizer.stopContinuousRecognitionAsync();
      this.speechRecognizer.close();
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

      const ongoingRecognizer = this.ensureRecognizer();
      ongoingRecognizer.update(event.result.text);
    };

    recognizer.recognized = (
      sender: Recognizer,
      event: SpeechRecognitionEventArgs,
    ) => {
      console.log('recognized on ' + this.microphone.deviceName)
      if (!event.result.text) {
        return;
      }

      const ongoingRecognizer = this.ensureRecognizer();
      ongoingRecognizer.update(event.result.text);
      ongoingRecognizer.complete()

      this.ongoingRecognizer = null;
    };
    this.speechRecognizer = recognizer;
  }

  private ensureRecognizer(): OngoingRecognizer {
    if (!this.ongoingRecognizer) {
      this.ongoingRecognizer = createOngoingRecognizer({
        textPrefix: this.microphone.prefix,
        role: this.microphone.role,
      });
      this.spoke.emit(this.ongoingRecognizer.recognition())
    }
    return this.ongoingRecognizer;
  }

  ngOnDestroy() {
    try {
      this.speechRecognizer?.close();
    } catch (error) {
      if (error instanceof Error && error.message.includes('the object is already disposed')) {
        console.info('speechRecognizer already disposed');
      } else {
        console.error('could not dispose speechRecognizer', error);
      }
    }
    this.subscription?.unsubscribe();
    this.keyboard.unregister(this.callbackId);
  }
}
