import { Injectable } from '@angular/core';
import {
  OngoingRecogniztion,
  TextRecogniztion,
} from '../components/microphone-lane/microphone-lane.component';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { OpenAiService, OpenAIState } from './open-ai.service';
import { Recording } from './prerecording.service';

export type ConversationRole = 'assistant' | 'user' | 'system';
export type Decision = 'yes' | 'skip' | 'open';

export interface CompletedConversationMessage {
  id: number;
  text: string;
  decision: Decision;
  highlight: boolean;
  queued: boolean;
  played: boolean;
  role: ConversationRole;
  completed: true;
}

export interface OngoingConversationMessage {
  id: number;
  text$: Observable<string>;
  role: ConversationRole;
  textPrefix?: string;
  completed: false;
}

export type ConversationMessage =
  | OngoingConversationMessage
  | CompletedConversationMessage;

@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  messagesSubject = new BehaviorSubject<ConversationMessage[]>([]);
  highlightSubject = new BehaviorSubject<CompletedConversationMessage | null>(
    null,
  );
  messageMap: {[key: number]: ConversationMessage} = {};

  messages$ = this.messagesSubject.asObservable();
  highlight$ = this.highlightSubject.asObservable();

  constructor(private openAI: OpenAiService) {
    this.openAI.state$.subscribe((state) => {
      this.clear(state);
    });

    window.addEventListener('keydown', (evt) => {
      if (evt.code === 'Space') {
        if (this.highlightSubject.value) {
          this.highlightSubject.value.decision = 'yes';
          this.goToNextPart(this.highlightSubject.value);
          this.messagesSubject.next(this.messagesSubject.value);
        }
      } else if (evt.code === 'ArrowRight' || evt.code === 'Tab') {
        if (
          this.highlightSubject.value &&
          this.highlightSubject.value.decision === 'open'
        ) {
          this.highlightSubject.value.decision = 'skip';
          this.goToNextPart(this.highlightSubject.value);
          this.messagesSubject.next(this.messagesSubject.value);
        }
        evt.preventDefault();
        evt.stopPropagation();
      } else if (evt.code === 'ArrowLeft') {
        if (this.highlightSubject.value) {
          // TODO allow back
        }
      }
    });
  }

  private goToNextPart(part: CompletedConversationMessage) {
    part.highlight = false;

    const index = this.messagesSubject.value.indexOf(part);
    if (index < this.messagesSubject.value.length - 1) {
      const highlightedPart = this.messagesSubject.value[index + 1];
      if (highlightedPart.completed) {
        highlightedPart.highlight = true;
        this.highlightSubject.next(highlightedPart);
      } else {
        this.highlightSubject.next(null);
      }
    } else {
      this.highlightSubject.next(null);
    }
  }

  async clear(state?: OpenAIState) {
    if (!state) {
      state = await firstValueFrom(this.openAI.state$);
    }

    const messageId = Date.now();
    this.messagesSubject.next(
      state.rolePlayScript
        ? [
            {
              role: 'system',
              id: messageId,
              decision: 'yes',
              completed: true,
              highlight: false,
              played: true,
              queued: true,
              text: state.rolePlayScript,
            },
          ]
        : [],
    );
    this.highlightSubject.next(null);
  }

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

  pushPrerecording(recording: Recording) {
    this.addCompletedMessage(Date.now(), recording.content, 'assistant', 'yes')
  }

  push(text: TextRecogniztion) {
    const existing = this.messageMap[text.id];
    if (existing) {
      this.updateMessage(text, existing);
    } else {
      this.addMessage(text);
    }
  }

  private addCompletedMessage(id: number,
    text: string, role: ConversationRole, decision: Decision
  ): CompletedConversationMessage {
    const newMessage: CompletedConversationMessage = {
      text,
      id,
      decision,
      highlight: false,
      played: false,
      queued: false,
      role,
      completed: true,
    };
    this.messageMap[newMessage.id] = newMessage;
    this.messagesSubject.value.push(newMessage);
    if (!this.highlightSubject.value) {
      newMessage.highlight = true;
      this.highlightSubject.next(newMessage);
    }
    this.messagesSubject.next(this.messagesSubject.value);
    return newMessage;
  }

  private addOngoingMessage(id: number, text$: Observable<string>, role: ConversationRole) {
    const newMessage: OngoingConversationMessage = {
      id,
      text$,
      completed: false,
      role,
    }
    this.messageMap[newMessage.id] = newMessage;
    this.messagesSubject.value.push(newMessage);
    this.messagesSubject.next(this.messagesSubject.value);
  }

  private addMessage(text: TextRecogniztion) {
    if (text.completed) {
      this.addCompletedMessage(text.id, text.text, text.role, 'open');
    } else {
      this.addOngoingMessage(text.id, text.text$, text.role)
    }
  }

  private updateMessage(text: TextRecogniztion, message: ConversationMessage) {
    if (text.completed) {
      if (!message.completed) {
        const completedMessage: CompletedConversationMessage = {
          text: text.text,
          id: message.id,
          completed: true,
          role: message.role,
          played: false,
          highlight: false,
          decision: 'open',
          queued: false,
        }
        if (!this.highlightSubject.value) {
          completedMessage.highlight = true;
          this.highlightSubject.next(completedMessage);
        }
        this.messageMap[message.id] = completedMessage;
        const index = this.messagesSubject.value.indexOf(message);
        this.messagesSubject.value.splice(index, 1, completedMessage);
        this.messagesSubject.next(this.messagesSubject.value);
      }
    }
  }
}
