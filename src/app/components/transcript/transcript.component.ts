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
  private lastScrolledTo: number | null = null;

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
      this.developer = state.overrideMode;
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
    combineLatest([this.conversation.highlight$, this.conversation.latestOngoingSubject, interval(100)]).subscribe(([highlight, latestOngoing]) => {
      this.currentHighlight = highlight;

      if (!this.container?.nativeElement) {
        return;
      }

      const id = highlight ? highlight.id : latestOngoing ? latestOngoing.id : null;
      if(!id || this.lastScrolledTo === id) {
        return;
      }

      const part = this.container.nativeElement.querySelector(
        `[data-part-id="${id}"]`,
      );
      if (part) {
        this.lastScrolledTo = id;
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

  toggleExpanded() {
    this.expanded = !this.expanded;
  }

  async savePrerecording(message: CompletedConversationMessage) {
    this.prerecordings.save({
      content: message.text,
      rate: undefined,
    });
  }

  async speakMessage(message: CompletedConversationMessage) {
    this.speaker.push(message.role, {content: message.text, rate: message.rate});
  }
}
