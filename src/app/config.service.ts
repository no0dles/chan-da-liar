import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  private subjects: { [key: string]: BehaviorSubject<any> } = {};

  get<T>(key: string): T | null {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  }

  watch<T>(key: string): Observable<T | null> {
    if (!this.subjects[key]) {
      this.subjects[key] = new BehaviorSubject<T | null>(this.get(key));
    }
    return this.subjects[key];
  }

  save(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
    if (this.subjects[key]) {
      this.subjects[key].next(value);
    }
  }

  reset() {
    localStorage.clear();
    for (const subject of Object.values(this.subjects)) {
      subject.next(null);
    }
  }
}
