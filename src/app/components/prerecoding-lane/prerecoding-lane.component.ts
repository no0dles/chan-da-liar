import { Component, ViewContainerRef } from '@angular/core';
import { faEdit, faPlay, faPlus } from '@fortawesome/free-solid-svg-icons';
import { ModalService } from '../../modules/modal/modal.service';
import { ConfigurationPrerecordingSidebarComponent } from '../configuration-prerecording-sidebar/configuration-prerecording-sidebar.component';
import {
  PrerecordingService,
  Recording,
} from '../../states/prerecording.service';
import { SpeakerService } from '../../states/speaker.service';
import { ConversationService } from '../../states/conversation.service';

@Component({
  selector: 'app-prerecoding-lane',
  templateUrl: './prerecoding-lane.component.html',
  styleUrls: ['./prerecoding-lane.component.scss'],
})
export class PrerecodingLaneComponent {
  playIcon = faPlay;

  state$ = this.prerecording.state$;
  constructor(
    private modal: ModalService,
    private prerecording: PrerecordingService,
    private speaker: SpeakerService,
    private conversation: ConversationService,
    private viewContainerRef: ViewContainerRef,
  ) {}

  openCreate() {
    this.modal.sidebar(this.viewContainerRef, {
      component: ConfigurationPrerecordingSidebarComponent,
      title: 'Create Prerecording',
      subtitle: 'Scripted responses',
    });
  }

  edit(index: number, content: string) {
    this.modal.sidebar(this.viewContainerRef, {
      component: ConfigurationPrerecordingSidebarComponent,
      title: 'Create Prerecording',
      subtitle: 'Scripted responses',
      props: {
        content,
        index,
      },
    });
  }

  play(rec: Recording, event: Event) {
    this.conversation.pushPrerecording(rec);
    const elm = event.target as HTMLElement;
    elm.blur();
  }
}
