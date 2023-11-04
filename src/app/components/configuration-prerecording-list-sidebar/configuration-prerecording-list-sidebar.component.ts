import { Component, ViewContainerRef } from '@angular/core';
import { ModalHandle, ModalInstance, ModalService } from '../../modules/modal/modal.service';
import { PrerecordingService, Recording } from '../../states/prerecording.service';
import {
  ConfigurationPrerecordingSidebarComponent
} from '../configuration-prerecording-sidebar/configuration-prerecording-sidebar.component';

@Component({
  selector: 'app-configuration-prerecording-list-sidebar',
  templateUrl: './configuration-prerecording-list-sidebar.component.html',
  styleUrls: ['./configuration-prerecording-list-sidebar.component.scss']
})
export class ConfigurationPrerecordingListSidebarComponent implements ModalInstance<void> {
  state$ = this.prerecording.state$;

  constructor(private prerecording: PrerecordingService,
              private viewContainerRef: ViewContainerRef,
              private modalService: ModalService,) {
  }

  modal!: ModalHandle<void>;

  edit(index:number, rec: Recording) {
    this.modalService.sidebar({
      component: ConfigurationPrerecordingSidebarComponent,
      title: 'Edit prerecording',
      subtitle: 'Prescripted answer',
      props: {
        index,
        recording: rec,
      },
    })
  }

  create() {
    this.modalService.sidebar({
      component: ConfigurationPrerecordingSidebarComponent,
      title: 'Create prerecording',
      subtitle: 'Prescripted answer',
      props: {},
    })
  }
}
