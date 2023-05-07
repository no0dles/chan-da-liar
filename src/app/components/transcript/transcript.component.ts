import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  faCheck,
  faCheckDouble,
  faFloppyDisk,
  faVolumeHigh,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { SpeakerService } from '../../states/speaker.service';
import {
  CompletedConversationMessage,
  ConversationMessage,
  ConversationService,
} from '../../states/conversation.service';
import { combineLatest, firstValueFrom, interval, Subscription, timer } from 'rxjs';
import { PrerecordingService } from 'src/app/states/prerecording.service';
import { AppService } from 'src/app/states/app.service';
import { OpenAiService } from 'src/app/states/open-ai.service';

@Component({
  selector: 'app-transcript',
  templateUrl: './transcript.component.html',
  styleUrls: ['./transcript.component.scss'],
})
export class TranscriptComponent implements OnInit, AfterViewInit, OnDestroy {
  private subscription?: Subscription;
  private currentHighlight: CompletedConversationMessage | null = null;

  saveIcon = faFloppyDisk;
  speakIcon = faVolumeHigh;
  clearIcon = faTimes;
  checkIcon = faCheck;
  doubleCheckIcon = faCheckDouble;

  @Input()
  systemMessage?: string | null;

  @ViewChild('container')
  container?: ElementRef<HTMLDivElement>;

  @ViewChild('messagelist')
  messageList?: ElementRef<HTMLDivElement>;

  messages$ = this.conversation.messages$;
  expanded = false;
  developer = false;
  selectedModel = '?';

  constructor(
    private speaker: SpeakerService,
    private conversation: ConversationService,
    private prerecordings: PrerecordingService,
    openai: OpenAiService,
    app: AppService,
  ) {
    app.state$.subscribe(state => {
      this.developer = state.developer;
    });
    openai.state$.subscribe(state => {
      this.selectedModel = state.selectedModel?.id ?? '?';
    });
  }

  ngOnInit() {
  }

  trackMessage(index: number, message: ConversationMessage) {
    return message.id;
  }

  ngAfterViewInit() {
    combineLatest([this.conversation.highlight$, interval(500)]).subscribe(([highlight]) => {
      this.currentHighlight = highlight;

      if (!this.container?.nativeElement || !highlight) {
        return;
      }


      const part = this.container.nativeElement.querySelector(
        `[data-part-id="${highlight.id}"]`,
      );
      if (part) {
        part.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  clear() {
    this.conversation.clear();
  }

  playMessage(message: string) {
    this.speaker.push('Response', message);
  }

  maybeShorten(message: CompletedConversationMessage) {
    if (message.role === 'system' && !this.expanded) {
      if (message.text.length > 120) {
        return message.text.substring(0, 120) + '...';
      }
    }
    return message.text;
  }

  toggleExpanded() {
    this.expanded = !this.expanded;
  }

  private async getMessage(id: number): Promise<ConversationMessage> {
    return (await firstValueFrom(this.messages$)).filter(m => m.id == id)[0];
  }

  async savePrerecording(e: MouseEvent) {
    const id = ((e.target as HTMLElement).closest('[data-part-id]') as HTMLElement).dataset['partId'] as number|undefined;
    const message = await this.getMessage(id!) as CompletedConversationMessage;
    this.prerecordings.save(message.text);
  }

  async speakMessage(e: MouseEvent) {
    const id = ((e.target as HTMLElement).closest('[data-part-id]') as HTMLElement).dataset['partId'] as number|undefined;
    const message = await this.getMessage(id!) as CompletedConversationMessage;
    this.speaker.push(message.role, message.text);
  }
}
