import { Component, ViewChild } from '@angular/core';
import { ConversationService } from '../../states/conversation.service';
import { InputComponent } from '../input/input.component';
import { PrerecordingService } from 'src/app/states/prerecording.service';
import { AppService } from 'src/app/states/app.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-override-lane',
  templateUrl: './override-lane.component.html',
  styleUrls: ['./override-lane.component.scss'],
})
export class OverrideLaneComponent {

  destination: string = 'bot';
  value: string = '';
  developer = this.app.state$.pipe(map(state => state.developer));

  @ViewChild('input', {static: false})
  input?: InputComponent;

  constructor(
    private conversation: ConversationService,
    private app: AppService,
    prerecordings: PrerecordingService,
  ) {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.code === 'KeyO') {
        if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
          this.input?.focusInput();
          event.stopPropagation();
          event.preventDefault();
        }
      }
    });
    prerecordings.editable.subscribe((content: string) => {
      if (content && this.input) {
        this.input.value = content;
        this.input?.focusInput();
      }
    });
  }

  valueChanged(value: string) {
    this.value = value;
  }

  keyDown(keyCode: string) {
    if (keyCode === 'Enter') {
      if (this.value) {
        if (this.destination === 'bot') {
          this.conversation.pushAssistant({content: this.value});
        } else if (this.destination === 'user') {
          this.conversation.pushUser({content: this.value});
        }
      }
      this.value = '';
      this.input?.blurInput()
    }
    if (keyCode === 'Tab') {
      this.destination = ({
        'bot': 'user',
        'user': 'bot',
      }[this.destination])!;
    }
  }

  setDeveloper(developer: boolean) {
    this.app.setDeveloper(developer);
  }
}
