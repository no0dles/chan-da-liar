import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { debounceTime, Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-textarea',
  templateUrl: './textarea.component.html',
  styleUrls: ['./textarea.component.scss'],
})
export class TextareaComponent implements OnInit, OnDestroy {
  private subscription?: Subscription;
  private changeSubject = new Subject<string>();

  @Input()
  heading!: string;

  @Input()
  value: string = '';

  @Output()
  onEnter = new EventEmitter<string>();

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

  keydown(evt: KeyboardEvent) {
    if (evt.code === 'Enter') {
      this.onEnter.emit(this.value);
    }
  }

  clear() {
    this.value = '';

  }
}
