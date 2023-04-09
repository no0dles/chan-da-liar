import {Component, Input} from '@angular/core';
import {AzureCognitiveService, AzureCognitiveState} from '../../states/azure-cognitive.service';
import {SpeakerService} from '../../states/speaker.service';

@Component({
  selector: 'app-voice-processor',
  templateUrl: './voice-processor.component.html',
  styleUrls: ['./voice-processor.component.scss']
})
export class VoiceProcessorComponent {
  @Input()
  value?: string;

  @Input()
  source!: string;

  constructor(private speaker: SpeakerService) {

  }

  play() {
    if (!this.value) {
      return;
    }

    this.speaker.push(this.source, this.value);
  }
}
