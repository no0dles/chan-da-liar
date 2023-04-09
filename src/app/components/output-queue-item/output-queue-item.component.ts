import {Component, Input} from '@angular/core';
import {OutputQueueItem, SpeakerService} from '../../states/speaker.service';
import {faRemove} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-output-queue-item',
  templateUrl: './output-queue-item.component.html',
  styleUrls: ['./output-queue-item.component.scss']
})
export class OutputQueueItemComponent {
  removeIcon = faRemove;

  @Input()
  item!: OutputQueueItem;

  constructor(private speaker: SpeakerService) {
  }

  remove() {
    this.speaker.remove(this.item);
  }
}
