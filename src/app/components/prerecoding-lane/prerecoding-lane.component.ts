import { Component, ViewContainerRef } from '@angular/core';
import { faEdit, faPlus } from '@fortawesome/free-solid-svg-icons';
import { ModalService } from '../../modules/modal/modal.service';
import { ConfigurationPrerecordingSidebarComponent } from '../configuration-prerecording-sidebar/configuration-prerecording-sidebar.component';
import {
  PrerecordingService,
  Recording,
} from '../../states/prerecording.service';
import { SpeakerService } from '../../states/speaker.service';

@Component({
  selector: 'app-prerecoding-lane',
  templateUrl: './prerecoding-lane.component.html',
  styleUrls: ['./prerecoding-lane.component.scss'],
})
export class PrerecodingLaneComponent {
  plusIcon = faPlus;
  editIcon = faEdit;

  state$ = this.prerecording.state$;
  constructor(
    private modal: ModalService,
    private prerecording: PrerecordingService,
    private speaker: SpeakerService,
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

  play(rec: Recording) {
    this.speaker.push('Prerecording', rec.content);
  }
}
