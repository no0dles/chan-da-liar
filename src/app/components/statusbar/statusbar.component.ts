import { Component } from '@angular/core';
import { faXmark, faBroom } from '@fortawesome/free-solid-svg-icons';
import { JavascriptError, StatusbarMessage, StatusbarMessageType, StatusbarService } from 'src/app/states/statusbar.service';

interface StatusItem {
  type: StatusbarMessageType;
  title: string;
  message?: string;
  expanded: boolean;
  visible: boolean;
  ts: string;
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
    let lastMessage = 0;
    service.messages$.subscribe((messages: StatusbarMessage[]) => {
      messages.slice(lastMessage).map(message => {
        this.add(message.type, message.title, message.message);
      });
      lastMessage = messages.length;
    });
  }

  empty() {
    return this.items.filter(item => item.visible).length === 0;
  }

  add(type: StatusbarMessageType, title: string, message?: string) {
    if (title.length > MAX_TITLE_LENGTH) {
      message = `…${title.substring(MAX_TITLE_LENGTH)}\n\n${message || ''}`;
      title = title.substring(0, MAX_TITLE_LENGTH) + '…';
    }
    this.items.push({
      type,
      title,
      message,
      expanded: false,
      visible: true,
      ts: new Date().toISOString().split('T')[1].split('.')[0],
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
