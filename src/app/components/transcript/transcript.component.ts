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
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { SpeakerService } from '../../states/speaker.service';
import {
  CompletedConversationMessage,
  ConversationMessage,
  ConversationService,
} from '../../states/conversation.service';
import { combineLatest, interval, Subscription, timer } from 'rxjs';

@Component({
  selector: 'app-transcript',
  templateUrl: './transcript.component.html',
  styleUrls: ['./transcript.component.scss'],
})
export class TranscriptComponent implements OnInit, AfterViewInit, OnDestroy {
  private subscription?: Subscription;
  private currentHighlight: CompletedConversationMessage | null = null;

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

  constructor(
    private speaker: SpeakerService,
    private conversation: ConversationService,
  ) {}

  ngOnInit() {
    interval(1000).subscribe(() => {
      this.conversation.pushUser({
        content: 'test',
      });
    });
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
}
