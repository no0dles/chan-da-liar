import { Injectable } from "@angular/core";
import { BehaviorSubject, combineLatest, firstValueFrom, Observable, Subscription } from "rxjs";
import { OpenAiService, OpenAIState, PromptMessage } from "./open-ai.service";
import { Recording } from "./prerecording.service";
import { OngoingRecognition } from "./ongoing-recognizer";
import { SpeakerService } from "./speaker.service";
import { FirebaseService } from "./firebase.service";

export type ConversationRole = "assistant" | "user" | "system";
export type Decision = "yes" | "skip" | "open";

export interface CompletedConversationMessage {
  id: number;
  text: string;
  displayedText: string;
  expandable: boolean;
  decision: Decision;
  highlight: boolean;
  queued: boolean;
  played: boolean;
  role: ConversationRole;
  completed: true;
  prefix: string | null;
  model?: string;
  initialDelayMs?: number;
}

export interface OngoingConversationMessage {
  id: number;
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
  providedIn: "root"
})
export class ConversationService {
  messageMaxLength = 120;

  messagesSubject = new BehaviorSubject<ConversationMessage[]>([]);
  highlightSubject = new BehaviorSubject<CompletedConversationMessage | null>(
    null
  );
  conversationId = Date.now().toString();
  ongoingConversations: OngoingConversationRecognition[] = [];

  messages$ = this.messagesSubject.asObservable();

  highlight$ = this.highlightSubject.asObservable();
  selectedModel = "?";

  constructor(
    private openAI: OpenAiService,
    private speaker: SpeakerService,
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

    window.addEventListener("keydown", (evt) => {
      if (evt.target instanceof HTMLInputElement || evt.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (evt.code === "Space") {
        if (this.highlightSubject.value) {
          this.highlightSubject.value.decision = "yes";
          this.goToNextPart(this.highlightSubject.value);
          this.messagesSubject.next(this.messagesSubject.value);
        }
      } else if (evt.code === "ArrowRight" || evt.code === "Backspace") {
        if (
          this.highlightSubject.value &&
          this.highlightSubject.value.decision === "open"
        ) {
          this.highlightSubject.value.decision = "skip";
          this.goToNextPart(this.highlightSubject.value);
          this.messagesSubject.next(this.messagesSubject.value);
        }
        evt.preventDefault();
        evt.stopPropagation();
      } else if (evt.code === "ArrowLeft") {
        if (this.highlightSubject.value) {
          // TODO allow back
        }
      }
    });
  }

  private goToNextPart(part: CompletedConversationMessage) {
    part.highlight = false;

    const index = this.messagesSubject.value.indexOf(part);
    if (part.role === "user" && part.decision === "yes") {
      this.resolve(index);
    } else if (part.role === "assistant" && part.decision === "yes") {
      this.queue(part);
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

    this.messagesSubject.next(
      state.rolePlayScript
        ? [
          {
            id: Date.now(),
            displayedText: this.getDisplayText("system", state.rolePlayScript),
            expandable: this.isExpandable("system", state.rolePlayScript),
            role: "system",
            decision: "yes",
            completed: true,
            highlight: false,
            played: true,
            prefix: null,
            queued: true,
            text: state.rolePlayScript,
            model: state.selectedModel?.id
          }
        ]
        : []
    );
    this.ongoingConversations = [];
    this.highlightSubject.next(null);
  }

  resolve(untilIndex: number) {
    const promptMessages: PromptMessage[] = [];
    for (let i = 0; i <= untilIndex; i++) {
      const message = this.messagesSubject.value[i];
      if (!message.completed) {
        continue;
      }
      if (message.decision !== "yes") {
        continue;
      }
      promptMessages.push({
        content: !!message.prefix ? `${message.prefix}${message.text}` : message.text,
        role: message.role
      });
    }

    this.openAI.prompt(promptMessages).then(recogniztion => {
      this.push(recogniztion, untilIndex + 1);
    });
  }

  pushAssistant(recording: Recording) {
    const newMessage = this.createCompletedMessage(recording.content, "assistant", "yes", null);
    this.queue(newMessage);
    const lastDecisionIndex = this.messagesSubject.value.findIndex(m => !m.completed || m.decision === "open");
    if (lastDecisionIndex >= 0) {
      this.messagesSubject.value.splice(lastDecisionIndex, 0, newMessage);
    } else {
      this.messagesSubject.value.push(newMessage);
    }
    this.messagesSubject.next(this.messagesSubject.value);
  }

  pushUser(recording: Recording) {
    const newMessage = this.createCompletedMessage(recording.content, "user", "open", null);
    this.messagesSubject.value.push(newMessage);
    this.messagesSubject.next(this.messagesSubject.value);
  }

  queue(message: CompletedConversationMessage) {
    message.queued = true;
    this.messagesSubject.next(this.messagesSubject.value);

    this.speaker.push(message.role, message.text).then(() => {
      message.played = true;
      this.messagesSubject.next(this.messagesSubject.value);
    });
  }

  push(recognition: OngoingRecognition, insertAt?: number) {
    const ongoingMessage: OngoingConversationMessage = {
      id: Date.now(),
      text$: recognition.text$,
      completed: false,
      role: recognition.role
    };

    let currentIndex = insertAt ?? this.messagesSubject.value.length;

    const ongoingConversation: OngoingConversationRecognition = {
      insertAt: currentIndex,
      recognition,
      subscription: combineLatest([
        recognition.completed, recognition.initialDelayMs,
      ]).subscribe(([completed, initialDelayMs]) => {
        const message = this.createCompletedMessage(completed, recognition.role, "open", recognition.textPrefix ?? null);
        if (initialDelayMs) {
          message.initialDelayMs = initialDelayMs;
        }
        this.messagesSubject.value.push(message);

        const index = this.messagesSubject.value.indexOf(ongoingMessage);
        if (index >= 0) {
          this.messagesSubject.value.splice(index, 1);
          this.messagesSubject.value.push(ongoingMessage);
        }
        
        this.messagesSubject.next(this.messagesSubject.value);

        currentIndex++;
      })
    };

    this.ongoingConversations.push(ongoingConversation);
    this.messagesSubject.value.push(ongoingMessage);
    this.messagesSubject.next(this.messagesSubject.value);

    recognition.end.then(() => {
      ongoingConversation.subscription?.unsubscribe();
      const index = this.ongoingConversations.indexOf(ongoingConversation);
      if (index >= 0) {
        this.ongoingConversations.splice(index, 1);
      }

      const ongoingIndex = this.messagesSubject.value.indexOf(ongoingMessage);
      if (ongoingIndex >= 0) {
        this.messagesSubject.value.splice(ongoingIndex, 1);
        this.messagesSubject.next(this.messagesSubject.value);
      }
    });
  }

  private isExpandable(role: ConversationRole, text: string) {
    return role === "system" && text.length > this.messageMaxLength;
  }

  private getDisplayText(role: ConversationRole, text: string) {
    return this.isExpandable(role, text) ? text.substring(0, this.messageMaxLength) + "..." : text;
  }

  private createCompletedMessage(
    text: string, role: ConversationRole, decision: Decision, prefix: string | null
  ): CompletedConversationMessage {
    const newMessage: CompletedConversationMessage = {
      id: Date.now(),
      displayedText: this.getDisplayText(role, text),
      expandable: this.isExpandable(role, text),
      text,
      decision,
      highlight: false,
      played: false,
      queued: false,
      role,
      completed: true,
      prefix,
    };
    if (!this.highlightSubject.value && decision === "open") {
      newMessage.highlight = true;
      this.highlightSubject.next(newMessage);
    }
    return newMessage;
  }
}
