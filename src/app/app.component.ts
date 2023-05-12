import {Component, ViewContainerRef} from '@angular/core';
import {ModalService} from './modules/modal/modal.service';
import {ConfigurationSidebarComponent} from './components/configuration-sidebar/configuration-sidebar.component';
import { firstValueFrom, map } from "rxjs";
import {ChanDaLiarService} from './states/chan-da-liar.service';
import {OpenAiService} from './states/open-ai.service';
import {ConversationService} from './states/conversation.service';
import { faGear } from '@fortawesome/free-solid-svg-icons';
import { OngoingRecognition } from './states/ongoing-recognizer';
import { AppService } from "./states/app.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  settingsIcon = faGear;

  state$ = this.chanDaLiar.state$;
  overrideMode$ = this.app.state$.pipe(map(state => state.overrideMode));
  liveEditMode$ = this.app.state$.pipe(map(state => state.overrideMode && state.livePresetEdit))

  constructor(
    private modal: ModalService,
    private viewContainerRef: ViewContainerRef,
    private openAI: OpenAiService,
    private chanDaLiar: ChanDaLiarService,
    private app: AppService,
    private conversation: ConversationService
  ) {
    firstValueFrom(this.state$).then((state) => {
      if (!state.ready) {
        this.openConfigurations(false);
      }
    });
  }

  openConfigurations(canDismiss: boolean) {
    return this.modal.sidebar(this.viewContainerRef, {
      component: ConfigurationSidebarComponent,
      title: 'Configurations',
      subtitle: 'Credentials and Settings',
      canDismiss,
    });
  }

  spoke(content: OngoingRecognition) {
    this.conversation.push(content);
  }
}
