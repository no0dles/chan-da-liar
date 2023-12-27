import { Component, Input } from '@angular/core';
import {
  AzureCognitiveService,
  AzureCognitiveState,
} from '../../states/azure-cognitive.service';
import { SpeakerService } from '../../states/speaker.service';

@Component({
  selector: 'app-voice-processor',
  templateUrl: './voice-processor.component.html',
  styleUrls: ['./voice-processor.component.scss'],
})
export class VoiceProcessorComponent {
  @Input()
  value?: string | string[];

  @Input()
  rate?: number | undefined;

  @Input()
  source!: string;

  constructor(private speaker: SpeakerService) {}

  play() {
    if (!this.value) {
      return;
    }

    if (this.value instanceof Array) {
     for (const item of this.value) {
       this.speaker.push(this.source, {content:item, rate: this.rate});
     }
    } else {
      this.speaker.push(this.source, {content: this.value, rate: this.rate});
    }
  }
}
