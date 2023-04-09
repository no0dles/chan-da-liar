import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ModalHandle, ModalInstance } from '../../modules/modal/modal.service';
import { PrerecordingService } from '../../states/prerecording.service';
import { TranscriptComponent } from '../transcript/transcript.component';

@Component({
  selector: 'app-configuration-prerecording-sidebar',
  templateUrl: './configuration-prerecording-sidebar.component.html',
  styleUrls: ['./configuration-prerecording-sidebar.component.scss'],
})
export class ConfigurationPrerecordingSidebarComponent
  implements OnInit, ModalInstance<void>
{
  modal!: ModalHandle<void>;
  editMode = false;

  @ViewChild(TranscriptComponent)
  transcript?: TranscriptComponent;

  @Input()
  content: string = '';

  @Input()
  index?: number;

  constructor(private prerecording: PrerecordingService) {}

  ngOnInit() {
    this.editMode =
      this.index !== null && this.index !== undefined && this.index >= 0;
  }

  create() {
    if (!this.transcript || !this.transcript.value) {
      return;
    }

    if (this.index !== null && this.index !== undefined && this.index >= 0) {
      this.prerecording.edit(this.index, this.transcript.value);
    } else {
      this.prerecording.save(this.transcript.value);
    }
    this.modal.dismiss();
  }
}
