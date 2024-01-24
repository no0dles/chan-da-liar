import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';

type InputType = 'text' | 'password';

@Component({
  selector: 'app-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss'],
})
export class InputComponent {
  @Input()
  inputType: InputType = 'text';

  @Input()
  heading!: string;

  @Input()
  placeholder?: string = '';

  @Input()
  value?: string | null = '';

  @Input()
  captureTab?: boolean | null = false;

  @ViewChild('input', {static: false})
  input?: ElementRef;

  @Output()
  valueChanged = new EventEmitter<string>();

  @Output()
  keyDown = new EventEmitter<string>();

  @Output()
  enterPressed = new EventEmitter<string>();

  focusInput() {
    this.input?.nativeElement.focus();
  }

  blurInput() {
    this.input?.nativeElement.blur();
  }

  @HostListener('keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.code === 'Escape') {
      this.input?.nativeElement.blur();
    }
    if (event.code === 'Enter') {
      this.enterPressed.emit(this.input?.nativeElement.value);
    }
    if (event.code === 'Tab' && this.captureTab) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.keyDown.emit(event.code);
  }
}
