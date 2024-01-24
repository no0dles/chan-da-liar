import { Component, Input } from '@angular/core';
import { SpeakerService } from '../../states/speaker.service';

@Component({
  selector: 'app-output-queue',
  templateUrl: './output-queue.component.html',
  styleUrls: ['./output-queue.component.scss'],
})
export class OutputQueueComponent {
  queue$ = this.speaker.queue$;

  @Input()
  output!: MediaDeviceInfo;

  constructor(private speaker: SpeakerService) {}
}
