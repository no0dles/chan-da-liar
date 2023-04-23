import {
  Component,
  EventEmitter,
  Input, OnInit,
  Output,
} from '@angular/core';
import { ConversationMessage, Role } from '../../states/open-ai.service';
import { faPlay, faTimes } from '@fortawesome/free-solid-svg-icons';
import { SpeakerService } from '../../states/speaker.service';

@Component({
  selector: 'app-transcript',
  templateUrl: './transcript.component.html',
  styleUrls: ['./transcript.component.scss'],
})
export class TranscriptComponent implements OnInit {
  clearIcon = faTimes;
  playIcon = faPlay;

  @Input()
  systemMessage?: string | null;

  @Input()
  messages: ConversationMessage[] = [];

  @Output()
  messagesChange = new EventEmitter<ConversationMessage[]>();

  constructor(private speaker: SpeakerService) {
  }

  ngOnInit() {
    this.addSystemMessage();
  }

  private addSystemMessage() {
    if (this.systemMessage) {
      this.messages.push({
        role: Role.System,
        content: this.systemMessage,
      })
    }
  }

  clear() {
    this.messages = [];
    this.addSystemMessage();
    this.messagesChange.emit(this.messages)
  }

  removeMessage(message: ConversationMessage) {
    const index = this.messages.indexOf(message)
    if (index >= 0) {
      if (this.messages[index+1] && this.messages[index+1].role === 'assistant') {
        this.messages.splice(index, 2);
      } else {
        this.messages.splice(index, 1);
      }
    }
    this.messagesChange.emit(this.messages)
  }

  playMessage(message: string) {
    this.speaker.push('Response', message);
  }
  isSystem(message: ConversationMessage) {
    return message.role == Role.System;
  }

  isAssistant(message: ConversationMessage) {
    return message.role == Role.Assistant;
  }

  isUser(message: ConversationMessage) {
    return message.role == Role.User;
  }

}
