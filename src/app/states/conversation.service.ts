import {Injectable} from '@angular/core';
import {OngoingRecogniztion, TextRecogniztion} from '../components/microphone-lane/microphone-lane.component';
import {BehaviorSubject, Observable} from 'rxjs';

export type ConversationRole = 'assistant' | 'user'
export type Decision = 'yes' | 'skip' | 'open';

export interface ConversationMessagePart {
  text: string
  decision: Decision
  highlight: boolean
}

export interface ConversationMessage {
  parts: ConversationMessagePart[]
  ongoing: OngoingRecogniztion | null
  role: ConversationRole
}

@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  messagesSubject = new BehaviorSubject<ConversationMessage[]>([])
  messageMap: {[key:number]: ConversationMessage} = {};
  parts: ConversationMessagePart[] = [];
  highlightedPart: ConversationMessagePart | null = null;

  messages$ = this.messagesSubject.asObservable();

  test() {

    // const newMessage: ConversationMessage = {
    //   role: 'user',
    //   content,
    // }
    // this.messages.push(newMessage)
    // this.openAI.prompt(this.messages).then(response => {
    //   if (response && this.messages[this.messages.length-1] === newMessage) {
    //     this.messages.push(response);
    //   }
    // })
  }

  push(text: TextRecogniztion) {
    const existing = this.messageMap[text.messageId];
    if (existing) {
      this.updateText(text, existing)
    } else {
      this.addText(text)
    }
    this.messagesSubject.next(this.messagesSubject.value);
  }

  private addPart(text: string): ConversationMessagePart {
    const part: ConversationMessagePart = {text, decision: 'open', highlight: false}
    this.parts.push(part)
    if (!this.highlightedPart) {
      this.highlightedPart = part;
      part.highlight = true;
    }
    return part;
  }

  private addText(text: TextRecogniztion) {
    if (text.completed) {
      const message: ConversationMessage = {
        parts: [this.addPart(text.text)],
        ongoing: null,
        role: text.role,
      }
      this.messageMap[text.messageId] = message;
      this.messagesSubject.value.push(message)
    } else {
      const message: ConversationMessage = {
        parts: [],
        ongoing: text,
        role: text.role,
      }
      this.messageMap[text.messageId] = message;
      this.messagesSubject.value.push(message)
    }
  }
  private updateText(text: TextRecogniztion, message: ConversationMessage) {
    if (text.completed) {
      if (message.ongoing && message.ongoing.partId === text.partId) {
        message.ongoing = null;
      }
      message.parts.push(this.addPart(text.text))
    } else {
      message.ongoing = text
    }
  }
}
