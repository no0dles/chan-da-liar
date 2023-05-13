import { Component, Input, ViewContainerRef } from "@angular/core";
import { faPlay, faTrashCan, faPen } from '@fortawesome/free-solid-svg-icons';
import { ModalService } from '../../modules/modal/modal.service';
import { ConfigurationPrerecordingSidebarComponent } from '../configuration-prerecording-sidebar/configuration-prerecording-sidebar.component';
import {
  PrerecordingService,
  Recording,
} from '../../states/prerecording.service';
import { ConversationService } from '../../states/conversation.service';
import { firstValueFrom, lastValueFrom, map, take } from 'rxjs';
import { AppService } from 'src/app/states/app.service';

@Component({
  selector: 'app-prerecoding-lane',
  templateUrl: './prerecoding-lane.component.html',
  styleUrls: ['./prerecoding-lane.component.scss'],
})
export class PrerecodingLaneComponent {
  playIcon = faPlay;
  deleteIcon = faTrashCan;
  modifyIcon = faPen;

  @Input()
  allowEdit?: boolean | null = false;

  @Input()
  allowDelete?: boolean | null = false;

  @Input()
  editMode: 'inline' | 'sidepanel' = 'inline'

  state$ = this.prerecording.state$;
  constructor(
    private modal: ModalService,
    private prerecording: PrerecordingService,
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
    this.conversation.pushAssistant(rec);
    const elm = event.target as HTMLElement;
    elm.blur();
  }

  async modify(index: number, content: string) {
    if (this.editMode === 'inline') {
      // We first emit '' to force an update if the text input was edited.
      this.prerecording.editable.next('');
      this.prerecording.editable.next(content);
    } else {
      this.edit(index, content)
    }
  }

  async delete(index: number) {
    this.prerecording.delete(index);
  }
}
