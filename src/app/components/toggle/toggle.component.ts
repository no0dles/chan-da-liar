import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toggle',
  templateUrl: './toggle.component.html',
  styleUrls: ['./toggle.component.scss'],
})
export class ToggleComponent {
  @Input()
  enabled = false;

  @Output()
  enabledChanged = new EventEmitter<boolean>();

  toggle(event: Event|null = null) {
    this.enabled = !this.enabled;
    this.enabledChanged.emit(this.enabled);

    if (event) {
      const elm = event.target as HTMLElement
      elm.blur();
    }
  }
}
