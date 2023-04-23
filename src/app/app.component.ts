import { Component, ViewChild, ViewContainerRef } from '@angular/core';
import { ModalService } from './modules/modal/modal.service';
import { ConfigurationSidebarComponent } from './components/configuration-sidebar/configuration-sidebar.component';
import { firstValueFrom } from 'rxjs';
import { ChanDaLiarService } from './states/chan-da-liar.service';
import { ConversationMessage, OpenAiService, Role } from './states/open-ai.service';
import { SpeakerService } from './states/speaker.service';
import { TextareaComponent } from './components/textarea/textarea.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  @ViewChild('moderatorText')
  moderatorText?: TextareaComponent;

  messages: ConversationMessage[] = [];
  ongoing = false;

  state$ = this.chanDaLiar.state$;

  constructor(
    private modal: ModalService,
    private viewContainerRef: ViewContainerRef,
    private openAI: OpenAiService,
    private chanDaLiar: ChanDaLiarService,
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

  speaking(content: string) {
    console.log('got speaking', content);
    if (!this.ongoing) {
      this.messages.push({role: Role.User, content: ''});
    }
    this.ongoing = true;
    this.messages[this.messages.length - 1].content = content;
  }

  interact(unused: string) {
    this.openAI.prompt(this.messages).then(response => {
      if (response) {
        this.messages.push(response);
      }
    });
  }

  spoke(content: string) {
    this.ongoing = false;
  }

  fakeResponse(content: string) {
    this.messages.push({
      content,
      role: Role.Assistant,
    })
    this.speaker.push('direct', content);
    this.moderatorText?.clear();
  }

  updateMessages(messages: ConversationMessage[]) {
    if (messages.length > 0 && messages[messages.length - 1].role === Role.Assistant) {
      return;
    }

    this.openAI.prompt(messages).then(response => {
      if (response) {
        this.messages.push(response);
      }
    })
  }

}
