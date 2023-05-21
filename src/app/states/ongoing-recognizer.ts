import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { ConversationRole } from './conversation.service';

export interface OngoingRecognition {
  text$: Observable<string>;
  end: Promise<void>;
  rate: number | undefined
  completed: Observable<string>;
  initialDelayMs: Observable<number|null>;
  textPrefix?: string;
  role: ConversationRole;
}

export interface OngoingRecognizer {
  update(text: string): void;
  append(text: string): void;
  setInitialDelay(ms: number): void;
  complete(): void;
  recognition(): OngoingRecognition;
}


export function createOngoingRecognizer(options: {textPrefix: string | undefined, role: ConversationRole }): OngoingRecognizer {
  let resolveFn: () => void;

  const startedAt = Date.now();
  const completedSubject = new ReplaySubject<string>()
  const textSubject = new BehaviorSubject<string>('');
  const initialDelayMs = new BehaviorSubject<number|null>(null);
  const end = new Promise<void>((resolve) => {
    resolveFn = resolve;
  })

  return {
    append(text: string) {
      const newText = textSubject.value + text;
      const cs = Date.now() - startedAt > 1000 ? '?!.' : '?!.';
      for (const c of cs) {
        const i = newText.lastIndexOf(c);
        if (i !== -1) {
          completedSubject.next(newText.substring(0, i + 1));
          textSubject.next(newText.substring(i + 1))
          return
        }
      }

      textSubject.next(newText);
    },
    complete() {
      if (textSubject.value.length > 0) {
        completedSubject.next(textSubject.value);
      }
      resolveFn();
    },
    update(text: string) {
      textSubject.next(text);
    },
    setInitialDelay(ms) {
      initialDelayMs.next(ms);
    },
    recognition(): OngoingRecognition {
      return {
        role: options.role,
        textPrefix: options.textPrefix,
        end,
        rate: undefined,
        completed: completedSubject.asObservable(),
        text$: textSubject.asObservable(),
        initialDelayMs: initialDelayMs.asObservable(),
      }
    },
  }
}
