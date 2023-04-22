import {Component, ViewChild, ViewContainerRef} from '@angular/core';
import {ModalService} from './modules/modal/modal.service';
import {ConfigurationSidebarComponent} from './components/configuration-sidebar/configuration-sidebar.component';
import {firstValueFrom} from 'rxjs';
import {ChanDaLiarService} from './states/chan-da-liar.service';
import {ConversationMessage, OpenAiService} from './states/open-ai.service';
import {SpeakerService} from './states/speaker.service';
import {TextareaComponent} from './components/textarea/textarea.component';
import {TextRecogniztion} from './components/microphone-lane/microphone-lane.component';
import {ConversationService} from './states/conversation.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  @ViewChild('moderatorText')
  moderatorText?: TextareaComponent;

  messages: ConversationMessage[] = [];

  state$ = this.chanDaLiar.state$;

  constructor(
    private modal: ModalService,
    private viewContainerRef: ViewContainerRef,
    private openAI: OpenAiService,
    private chanDaLiar: ChanDaLiarService,
    private conversation: ConversationService,
    private speaker: SpeakerService,
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

  spoke(content: TextRecogniztion) {
    console.log(content)
    this.conversation.push(content);
  }

  fakeResponse(content: string) {
    this.messages.push({
      content,
      role: 'assistant',
    });
    this.speaker.push('direct', content);
    this.moderatorText?.clear();
  }

  updateMessages(messages: ConversationMessage[]) {
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      return;
    }

    this.openAI.prompt(messages).then(response => {
      if (response) {
        this.messages.push(response);
      }
    });
  }

}
