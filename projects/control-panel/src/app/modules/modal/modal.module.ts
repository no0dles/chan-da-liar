import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from './modal/modal.component';
import { ModalService } from './modal.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ModalSidebarComponent } from './modal-sidebar/modal-sidebar.component';
import { ModalConfirmComponent } from './modal-confirm/modal-confirm.component';

@NgModule({
  declarations: [ModalComponent, ModalSidebarComponent, ModalConfirmComponent],
  providers: [],
  imports: [CommonModule, FontAwesomeModule],
})
export class ModalModule {
  static forRoot(): ModuleWithProviders<ModalModule> {
    return {
      ngModule: ModalModule,
      providers: [ModalService],
    };
  }
}
