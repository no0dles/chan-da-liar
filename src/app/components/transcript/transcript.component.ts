import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { debounceTime, Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-transcript',
  templateUrl: './transcript.component.html',
  styleUrls: ['./transcript.component.scss'],
})
export class TranscriptComponent implements OnInit, OnDestroy {
  private subscription?: Subscription;
  private changeSubject = new Subject<string>();

  @Input()
  value: string = '';

  @Output()
  valueChange = new EventEmitter<string>();

  ngOnInit() {
    this.subscription = this.changeSubject
      .pipe(debounceTime(500))
      .subscribe((value) => {
        this.valueChange.emit(value);
      });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  change(evt: Event) {
    this.value = (evt.target as HTMLTextAreaElement).value;
    this.changeSubject.next(this.value);
  }

  clear() {
    this.value = '';
  }
}
