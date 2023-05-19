import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

type KeyEventListener = ((event: KeyboardEvent) => void) | (() => void);

@Injectable({
  providedIn: 'root',
})
export class KeyboardService {

  private globalListeners = new Map<string, Set<KeyEventListener>>();
  private globalExclusive = new Set<string>();
  private globalIdMap = new Map<number, KeyEventListener>();
  private callbackId = 0;

  constructor() {
    window.addEventListener('keydown', (evt: KeyboardEvent) => {
      if (evt.target instanceof HTMLInputElement || evt.target instanceof HTMLTextAreaElement) {
        return;
      }
      // console.log('keydown', evt);
      const listeners = this.globalListeners.get(evt.code);
      if (listeners) {
        for (const listener of listeners) {
          listener(evt);
        }
        evt.preventDefault();
        evt.stopPropagation();
      }
    });
  }

  registerExclusive(code: string, callback: KeyEventListener): number {
    return this.register(code, callback, true);
  }

  register(code: string, callback: KeyEventListener, exclusive: boolean = false): number {
    if (exclusive) {
      if (this.globalExclusive.has(code)) {
        throw new Error(`Key ${code} is already registered as exclusive`);
      }
      this.globalExclusive.add(code);
    }
    if (!this.globalListeners.has(code)) {
      this.globalListeners.set(code, new Set());
    }
    this.callbackId++;
    this.globalIdMap.set(this.callbackId, callback);
    this.globalListeners.get(code)!.add(callback);
    return this.callbackId;
  }

  unregister(id: number) {
    const callback = this.globalIdMap.get(id);
    if (callback) {
      for (const [key, listeners] of this.globalListeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.globalListeners.delete(key);
        }
      }
    }
  }

}
