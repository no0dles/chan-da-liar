import { ErrorHandler, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface JavascriptError {
  message: string;
  stack?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StatusbarService {

  errorsSubject = new BehaviorSubject<JavascriptError[]>([]);
  errors$ = this.errorsSubject.asObservable();
}

@Injectable({
  providedIn: 'root'
})
export class StatusbarErrorHandler implements ErrorHandler {

  constructor(private service: StatusbarService) {
  }

  handleError(error: any): void {
    this.service.errorsSubject.next([...this.service.errorsSubject.value, {
      message: error.message,
      stack: error.stack
    }]);
    console.error('ERROR', error.message);
  }
}
