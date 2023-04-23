import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
})
export class ButtonComponent {
  @Input()
  disabled = false;
  @Input()
  type = 'normal';
  getClass() {
    if (this.type === 'dangerous') {
      return 'bg-orange-600';
    }
    return 'bg-teal-500';
  }
}
