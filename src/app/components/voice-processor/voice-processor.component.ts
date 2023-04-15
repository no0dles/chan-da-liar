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
  source!: string;

  constructor(private speaker: SpeakerService) {}

  play() {
    if (!this.value) {
      return;
    }

    if (this.value instanceof Array) {
     for (const item of this.value) {
       this.speaker.push(this.source, item);
     }
    } else {
      this.speaker.push(this.source, this.value);
    }
  }
}
