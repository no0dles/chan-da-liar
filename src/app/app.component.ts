import {Component, ViewContainerRef} from '@angular/core';
import {ModalService} from './modules/modal/modal.service';
import {ConfigurationSidebarComponent} from './components/configuration-sidebar/configuration-sidebar.component';
import {firstValueFrom} from 'rxjs';
import {ChanDaLiarService} from './states/chan-da-liar.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  state$ = this.chanDaLiar.state$;

  constructor(private modal: ModalService,
              private viewContainerRef: ViewContainerRef,
              private chanDaLiar: ChanDaLiarService) {

    firstValueFrom(this.state$).then(state => {
      if (!state.ready) {
        this.openConfigurations(false)
      }
    })
  }

  openConfigurations(canDismiss: boolean) {
    return this.modal.sidebar(this.viewContainerRef, {
      component: ConfigurationSidebarComponent,
      title: 'Configurations',
      subtitle: 'Credentials and Settings',
      canDismiss,
    })
  }
}
