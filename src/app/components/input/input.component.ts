import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-input',
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss']
})
export class InputComponent {
  @Input()
  heading!: string

  @Input()
  placeholder?: string = ''

  @Input()
  value?: string | null = ''

  @Output()
  valueChanged = new EventEmitter<string>();
}
