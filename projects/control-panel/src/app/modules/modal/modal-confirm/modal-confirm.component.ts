import { Component, HostListener, Input, OnInit } from '@angular/core';
import { ModalHandle, ModalInstance } from '../modal.service';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'common-modal-confirm',
  templateUrl: './modal-confirm.component.html',
  styleUrls: ['./modal-confirm.component.scss'],
})
export class ModalConfirmComponent implements ModalInstance<boolean> {
  questionIcon = faQuestionCircle;

  @Input()
  title!: string;

  @Input()
  subtitle?: string;

  modal!: ModalHandle<boolean>;

  dismiss(evt: MouseEvent): void {
    this.modal.dismiss(false);
  }

  preventBubbleUp(evt: MouseEvent) {
    evt.stopPropagation();
  }
}
