import { Component } from '@angular/core';
import { faXmark, faBroom } from '@fortawesome/free-solid-svg-icons';
import { JavascriptError, StatusbarService } from 'src/app/states/statusbar.service';

type ItemType = 'info' | 'warning' | 'error';
interface StatusItem {
  type: ItemType;
  title: string;
  message?: string;
  expanded: boolean;
  visible: boolean;
}

const MAX_TITLE_LENGTH = 30;

@Component({
  selector: 'app-statusbar',
  templateUrl: './statusbar.component.html',
  styleUrls: ['./statusbar.component.scss']
})
export class StatusbarComponent {
  xmarkIcon = faXmark;
  broomIcon = faBroom;

  items: StatusItem[] = [];

  constructor(
    service: StatusbarService,
  ) {
    let lastError = 0;
    service.errors$.subscribe((errors: JavascriptError[]) => {
      errors.slice(lastError).map(error => {
        this.add('error', error.message, error.stack);
      });
      lastError = errors.length;
    });
  }

  add(type: ItemType, title: string, message?: string) {
    if (title.length > MAX_TITLE_LENGTH) {
      message = `…${title.substring(MAX_TITLE_LENGTH)}\n\n${message}`;
      title = title.substring(0, MAX_TITLE_LENGTH) + '…';
    }
    this.items.push({
      type,
      title,
      message,
      expanded: false,
      visible: true,
    });
  }

  clear() {
    this.items.forEach(item => { item.visible = false; });
  }

  toggle(i: number) {
    this.items[i].expanded = !this.items[i].expanded;
  }

  close(i: number) {
    this.items[i].visible = false;
  }
}
