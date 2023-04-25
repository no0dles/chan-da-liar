import {
  AfterViewInit,
  Component, ElementRef,
  Input, OnDestroy, OnInit, ViewChild,
} from '@angular/core';
import { faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { SpeakerService } from '../../states/speaker.service';
import { CompletedConversationMessage, ConversationService } from '../../states/conversation.service';
import { Subscription } from 'rxjs';

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


  @Input()
  systemMessage?: string | null;

  @ViewChild('container')
  container?: ElementRef<HTMLDivElement>;

  @ViewChild('messagelist')
  messageList?: ElementRef<HTMLDivElement>;



  messages$ = this.conversation.messages$;
  expanded = false;

  constructor(private speaker: SpeakerService, private conversation: ConversationService) {
  }

  ngOnInit() {

  }

  ngAfterViewInit() {
    this.conversation.highlight$.subscribe(highlight => {
      this.currentHighlight = highlight;

      if (!this.container?.nativeElement || !highlight) {
        return;
      }

      const part = this.container.nativeElement.querySelector(`[data-part-id="${highlight.id}"]`);
      if (part) {
        part.scrollIntoView({behavior: 'smooth', block: 'center'});
      } else {
        this.container.nativeElement.scrollTo({top: this.container.nativeElement.scrollHeight, behavior: 'smooth'})
      }
    })

    if (this.messageList?.nativeElement) {
      const observer = new ResizeObserver(() => {
        if (!this.currentHighlight && this.container?.nativeElement) {
          this.container.nativeElement.scrollTo({top: this.container.nativeElement.scrollHeight, behavior: 'smooth'})
        }
      });
      observer.observe(this.messageList?.nativeElement)
    }
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
