import { Component, ViewChild } from '@angular/core';
import { ConversationService } from '../../states/conversation.service';
import { InputComponent } from '../input/input.component';

@Component({
  selector: 'app-override-lane',
  templateUrl: './override-lane.component.html',
  styleUrls: ['./override-lane.component.scss'],
})
export class OverrideLaneComponent {

  bot: string = '';
  user: string = '';

  @ViewChild('botInput', {static: false})
  botInput?: InputComponent;
  @ViewChild('userInput', {static: false})
  userInput?: InputComponent;

  constructor(
    private conversation: ConversationService,
  ) {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.code === 'KeyB') {
        if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
          this.botInput?.focusInput();
          event.stopPropagation();
          event.preventDefault();
        }
      }
    });
  }

  botChanged(bot: string) {
    this.bot = bot;
  }

  userChanged(user: string) {
    this.user = user;
  }

  botKeyDown(keyCode: string) {
    if (keyCode === 'Enter') {
      if (this.bot) {
        this.conversation.pushAssistant({content: this.bot});
      }
      this.bot = '';
      this.botInput?.blurInput()
    }
    if (keyCode === 'Tab') {
      this.userInput?.focusInput();
    }
  }

  userKeyDown(keyCode: string) {
    if (keyCode === 'Enter') {
      if (this.user) {
        this.conversation.pushUser({content: this.user});
      }
      this.user = '';
      this.userInput?.blurInput()
    }
    if (keyCode === 'Tab') {
      this.botInput?.focusInput();
    }
  }
}
