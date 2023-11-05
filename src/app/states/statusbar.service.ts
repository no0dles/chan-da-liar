import { ErrorHandler, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface JavascriptError {
  message: string;
  stack?: string;
}

export type StatusbarMessageType = 'info' | 'warning' | 'error';

export interface StatusbarMessage {
  type: StatusbarMessageType;
  title: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StatusbarService {

  private messagesSubject = new BehaviorSubject<StatusbarMessage[]>([]);
  messages$ = this.messagesSubject.asObservable();

  addMessage(type: StatusbarMessageType, title: string, message?: string) {
    this.messagesSubject.next([...this.messagesSubject.value, {
      type, title, message,
    }]);
    if (type === 'info') console.info(title, message);
    if (type === 'warning') console.warn(title, message);
    if (type === 'error') console.error(title, message);
  }
}

@Injectable({
  providedIn: 'root'
})
export class StatusbarErrorHandler implements ErrorHandler {

  constructor(private service: StatusbarService) {
  }

  handleError(error: any): void {
    this.service.addMessage('error', error.message, error.stack);
  }
}
