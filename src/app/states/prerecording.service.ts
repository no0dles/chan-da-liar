import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map, shareReplay } from 'rxjs';
import { ConfigService } from '../config.service';

export interface Recording {
  content: string;
}

export interface PrerecordingState {
  recordings: Recording[];
  ready: boolean
}

@Injectable({
  providedIn: 'root',
})
export class PrerecordingService {
  private recordingsKey = 'pre-recordings';

  state$ = combineLatest([
    this.config.watch<Recording[]>(this.recordingsKey),
  ]).pipe(
    map(([recordings]) => this.mapState(recordings)),
    shareReplay(),
  );
  editable = new BehaviorSubject<string>('');

  constructor(private config: ConfigService) {}

  private mapState(recs: Recording[] | null): PrerecordingState {
    console.log('map recording')
    return {
      recordings: recs || [],
      ready: true,
    };
  }

  save(content: string) {
    const recordings = this.config.get<Recording[]>(this.recordingsKey) || [];
    recordings.push({ content });
    this.config.save(this.recordingsKey, recordings);
  }

  edit(index: number, content: string) {
    const recordings = this.config.get<Recording[]>(this.recordingsKey) || [];
    recordings[index] = { content };
    this.config.save(this.recordingsKey, recordings);
  }

  delete(index: number) {
    const recordings = this.config.get<Recording[]>(this.recordingsKey) || [];
    recordings.splice(index, 1);
    this.config.save(this.recordingsKey, recordings);
  }

  get(index: number): Recording {
    const recordings = this.config.get<Recording[]>(this.recordingsKey) || [];
    /**
     * there must be a better way?
     * 
     * I tried both
     * `await firstValueFrom(this.state$)`
     * and
     * `await lastValueFrom(this.state$.pipe(take(1)))`
     * but they returned stale values (i.e. when registering a new value via
     * transcript "save" icon, that new value was not yet available in the
     * recordings returned from above code).
     */
    return recordings[index];
  }
}
