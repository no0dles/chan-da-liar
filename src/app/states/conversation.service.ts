import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable, Subscription } from 'rxjs';
import { OpenAiService, OpenAIState, PromptMessage } from './open-ai.service';
import { Recording } from './prerecording.service';
import { OngoingRecognition } from './ongoing-recognizer';

export type ConversationRole = 'assistant' | 'user' | 'system';
export type Decision = 'yes' | 'skip' | 'open';

export interface CompletedConversationMessage {
  id: number
  text: string;
  decision: Decision;
  highlight: boolean;
  queued: boolean;
  played: boolean;
  role: ConversationRole;
  completed: true;
}

export interface OngoingConversationMessage {
  id: number
  text$: Observable<string>;
  role: ConversationRole;
  textPrefix?: string;
  completed: false;
}

export interface OngoingConversationRecognition {
  recognition: OngoingRecognition;
  insertAt: number;
  subscription: Subscription;
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
  ongoingConversations: OngoingConversationRecognition[] = [];

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
    if (part.role === 'user' && part.decision === 'yes') {
      this.resolve(index);
    }
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
              id: Date.now(),
              role: 'system',
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
    this.ongoingConversations = [];
    this.highlightSubject.next(null);
  }

  resolve(untilIndex: number) {
    const promptMessages: PromptMessage[] = [];
    for (let i = 0; i < untilIndex; i++) {
      const message = this.messagesSubject.value[i];
      if (!message.completed) {
        continue;
      }
      if (message.decision !== 'yes') {
        continue;
      }
      promptMessages.push({
        content: message.text,
        role: message.role,
      });
    }

    this.openAI.prompt(promptMessages).then(recogniztion => {
      this.push(recogniztion, untilIndex+1);
    })
  }

  pushPrerecording(recording: Recording) {
    const newMessage = this.createCompletedMessage(recording.content, 'assistant', 'yes')
    const lastDecisionIndex = this.messagesSubject.value.findIndex(m => !m.completed || m.decision === 'open');
    if (lastDecisionIndex >= 0) {
      this.messagesSubject.value.splice(lastDecisionIndex, 0, newMessage)
    } else {
      this.messagesSubject.value.push(newMessage)
    }
    this.messagesSubject.next(this.messagesSubject.value);
  }

  push(recognition: OngoingRecognition, insertAt?: number) {
    const ongoingMessage: OngoingConversationMessage = {
      id: Date.now(),
      text$: recognition.text$,
      completed: false,
      role: recognition.role,
    }

    let currentIndex = insertAt ?? this.messagesSubject.value.length;

    const ongoingConversation: OngoingConversationRecognition = {
      insertAt: currentIndex,
      recognition,
      subscription: recognition.completed.subscribe(completed => {
        const message = this.createCompletedMessage(completed, recognition.role, 'open')
        this.messagesSubject.value.splice(currentIndex-1, 1, message, ongoingMessage)
        this.messagesSubject.next(this.messagesSubject.value);
        currentIndex++
      })
    };

    this.ongoingConversations.push(ongoingConversation);
    this.messagesSubject.value.splice(currentIndex, 0, ongoingMessage)
    this.messagesSubject.next(this.messagesSubject.value);
    currentIndex++

    recognition.end.then(() => {
      ongoingConversation.subscription?.unsubscribe();
      const index = this.ongoingConversations.indexOf(ongoingConversation)
      if (index >= 0) {
        this.ongoingConversations.splice(index, 1);
      }

      const ongoingIndex = this.messagesSubject.value.indexOf(ongoingMessage);
      if (ongoingIndex >= 0) {
        this.messagesSubject.value.splice(ongoingIndex, 1);
        this.messagesSubject.next(this.messagesSubject.value);
      }
    })
  }

  private createCompletedMessage(
    text: string, role: ConversationRole, decision: Decision
  ): CompletedConversationMessage {
    const newMessage: CompletedConversationMessage = {
      id: Date.now(),
      text,
      decision,
      highlight: false,
      played: false,
      queued: false,
      role,
      completed: true,
    };
    if (!this.highlightSubject.value && decision==='open') {
      newMessage.highlight = true;
      this.highlightSubject.next(newMessage);
    }
    return newMessage;
  }
}
