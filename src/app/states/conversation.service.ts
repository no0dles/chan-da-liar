import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, firstValueFrom, map, Observable, Subject, Subscription } from 'rxjs';
import { OpenAiService, OpenAIState, PromptMessage } from './open-ai.service';
import { Recording } from './prerecording.service';
import { OngoingRecognition } from './ongoing-recognizer';
import { SpeakerService } from './speaker.service';
import { FirebaseService } from './firebase.service';
import { KeyboardService } from '../keyboard';

export type ConversationRole = 'assistant' | 'user' | 'system';
export type Decision = 'yes' | 'skip' | 'open';

export interface CompletedConversationMessage {

  completed: true;

  id: number;
  role: ConversationRole;
  prefix: string | null;
  text: string;
  rate?: number;

  decision: Decision;
  highlight: boolean;
  queued: boolean;
  played: boolean;
  editing?: boolean;

  model?: string;
  initialDelayMs?: number;
}

// This mirrors OngoingRecognition in ./ongoing-recognizer.ts
export interface OngoingConversationMessage {
  completed: false;

  id: number;
  role: ConversationRole;
  textPrefix?: string;
  text$: Observable<string>;
  rate: number | undefined;
}

interface OngoingConversationRecognition {
  recognition: OngoingRecognition;
  subscription: Subscription;
}

export type ConversationMessage =
  | OngoingConversationMessage
  | CompletedConversationMessage;


class MessageBuilder {
  private message: CompletedConversationMessage;
  constructor(text: string, role: ConversationRole) {
    this.message = {
      completed: true,

      id: Date.now(),
      role,
      prefix: null,
      text,
      rate: undefined,

      decision: 'open',
      highlight: false,
      queued: false,
      played: false,
      editing: false,
    };
  }
  rate(rate?: number): MessageBuilder {
    this.message.rate = rate;
    return this;
  }
  prefix(prefix: string|null): MessageBuilder {
    this.message.prefix = prefix;
    return this;
  }
  initialDelayMs(initialDelayMs: number|null): MessageBuilder {
    if (initialDelayMs) {
      this.message.initialDelayMs = initialDelayMs;
    }
    return this;
  }
  yes(): MessageBuilder {
    this.message.decision = 'yes';
    return this;
  }
  build(): CompletedConversationMessage {
    return this.message;
  }
}


@Injectable({
  providedIn: 'root'
})
export class ConversationService {
  messagesSubject = new BehaviorSubject<ConversationMessage[]>([]);
  highlightSubject = new BehaviorSubject<CompletedConversationMessage | null>(
    null
  );
  latestOngoingSubject = new BehaviorSubject<OngoingConversationMessage | null>(null);
  conversationId = Date.now().toString();
  private ongoingConversations: OngoingConversationRecognition[] = [];

  messages$ = this.messagesSubject.asObservable();
  promptMessages$ = this.messages$.pipe(
    map(messages => this.getPromptMessages(messages)));
  tokens$ = this.promptMessages$.pipe(
    map(messages => this.openAI.countTokens(JSON.stringify(messages)))
  );

  highlight$ = this.highlightSubject.asObservable();
  selectedModel = '?';

  constructor(
    private openAI: OpenAiService,
    private speaker: SpeakerService,
    keyboard: KeyboardService,
    firebase: FirebaseService
  ) {
    this.openAI.state$.subscribe((state) => {
      this.clear(state);
    });

    this.messages$.subscribe((messages) => {
      if (messages.length > 1) {
        firebase.setConversation(this.conversationId, messages.filter(message => message.completed));
      } else {
        this.conversationId = Date.now().toString();
      }
    });

    keyboard.registerExclusive('Space', () => this.decide('yes'));
    keyboard.registerExclusive('Enter', () => this.allYesAndPrompt());
    keyboard.registerExclusive('Backspace', () => this.decide('skip'));
    // keyboard.registerExclusive('KeyX', () => this.abort());
    // keyboard.registerExclusive('ArrowLeft', () => this.back());

    // keyboard.registerExclusive('KeyA', () => this.addAssistant());
  }

  // private abort() {
  //   //
  // }

  // private addAssistant() {
  // }

  private allYesAndPrompt() {
    while (this.highlightSubject.value) this.decide('yes');
    this.prompt();
  }

  private prompt() {
    const highlight = this.highlightSubject.value;
    const messages = this.messagesSubject.value;
    const insertAt = 
      highlight === null
      ? messages.length
      : messages.findIndex(message => message.id === highlight.id);
    const promptMessages = this.getPromptMessagesUntil(this.messagesSubject.value, insertAt - 1);
    this.openAI.prompt(promptMessages).then(recognition => {
      this.pushOngoing(recognition, insertAt);
    });
  }

  private decide(decision: Decision) {
    const message = this.highlightSubject.value;
    if (message) {
      message.decision = decision;
      this.nextMessages(this.messagesSubject.value);
      if (message.role === 'assistant' && decision === 'yes') {
        this.queue(message);
      }
    }
  }

  async clear(state?: OpenAIState) {
    if (!state) {
      state = await firstValueFrom(this.openAI.state$);
    }

    this.nextMessages(
      state.rolePlayScript ? [new MessageBuilder(state.rolePlayScript, 'system').yes().build()] : []
    );
    this.ongoingConversations = [];
  }

  private getPromptMessagesUntil(messages: ConversationMessage[], untilIndex: number): PromptMessage[] {
    const promptMessages: PromptMessage[] = [];
    for (let i = 0; i <= untilIndex && i < messages.length; i++) {
      const message = messages[i];
      if (message.completed && message.decision === 'yes') {
        promptMessages.push({
          content: !!message.prefix ? `${message.prefix}${message.text}` : message.text,
          role: message.role
        });
      }
    }
    return promptMessages;
  }

  private nextMessages(messages: ConversationMessage[]) {
    let highlight = null;
    for (const message of messages) {
      if (message.completed) {
        if (highlight === null && message.decision === 'open') {
          message.highlight = true;
          highlight = message;
        } else {
          message.highlight = false;
        }
      }
    }
    this.messagesSubject.next(messages);
    this.highlightSubject.next(highlight);
  }

  private getPromptMessages(messages: ConversationMessage[]): PromptMessage[] {
    return this.getPromptMessagesUntil(messages, messages.length - 1);
  }

  pushAssistant(recording: Recording) {
    const newMessage = new MessageBuilder(recording.content, 'assistant').rate(recording.rate).build();
    const lastDecisionIndex = this.messagesSubject.value.findIndex(m => !m.completed || m.decision === 'open');
    if (lastDecisionIndex >= 0) {
      this.messagesSubject.value.splice(lastDecisionIndex, 0, newMessage);
    } else {
      this.messagesSubject.value.push(newMessage);
    }
    this.nextMessages(this.messagesSubject.value);
  }

  pushUser(recording: Recording) {
    const newMessage = new MessageBuilder(recording.content, 'user').rate(recording.rate).build();
    this.messagesSubject.value.push(newMessage);
    this.nextMessages(this.messagesSubject.value);
  }

  queue(message: CompletedConversationMessage) {
    message.queued = true;
    this.nextMessages(this.messagesSubject.value);

    this.speaker.push(message.role, {content: message.text, rate: message.rate}).then(() => {
      message.played = true;
      this.nextMessages(this.messagesSubject.value);
    });
  }

  pushOngoing(recognition: OngoingRecognition, insertAt?: number) {
    const ongoingMessage: OngoingConversationMessage = {
      id: Date.now(),
      rate: recognition.rate,
      text$: recognition.text$,
      completed: false,
      role: recognition.role
    };

    const ongoingConversation: OngoingConversationRecognition = {
      recognition,
      subscription: combineLatest([
        recognition.completed, recognition.initialDelayMs,
      ]).subscribe(([completed, initialDelayMs]) => {
        const message = new MessageBuilder(completed, recognition.role)
            .prefix(recognition.textPrefix ?? null)
            .initialDelayMs(initialDelayMs)
            .build();
        const ongoingIndex = this.messagesSubject.value.indexOf(ongoingMessage);
        this.messagesSubject.value.splice(ongoingIndex, 0, message);
        this.nextMessages(this.messagesSubject.value);
      }),
    };

    this.latestOngoingSubject.next(ongoingMessage)
    this.ongoingConversations.push(ongoingConversation);
    this.messagesSubject.value.splice(insertAt ?? this.messagesSubject.value.length, 0, ongoingMessage);
    this.nextMessages(this.messagesSubject.value);

    recognition.end.then(() => {
      ongoingConversation.subscription?.unsubscribe();
      const index = this.ongoingConversations.indexOf(ongoingConversation);
      this.ongoingConversations.splice(index, 1);
      if(this.latestOngoingSubject.value === ongoingMessage) {
        this.latestOngoingSubject.next(null)
      }
      const ongoingIndex = this.messagesSubject.value.indexOf(ongoingMessage);
      this.messagesSubject.value.splice(ongoingIndex, 1);
      this.nextMessages(this.messagesSubject.value);
    });
  }
}
