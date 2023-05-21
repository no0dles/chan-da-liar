import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map, shareReplay } from 'rxjs';
import { ConfigService } from '../config.service';
import { FirebaseService } from './firebase.service';

export interface Recording {
  content: string;
  rate?: number;
}

export interface PrerecordingState {
  recordings: Recording[];
  ready: boolean
}

@Injectable({
  providedIn: 'root',
})
export class PrerecordingService {
  // TODO Rewrite to use single observable from firebse or config.
  private recordingsKey = 'pre-recordings';

  state$ = combineLatest([
    this.config.watch<Recording[]>(this.recordingsKey),
  ]).pipe(
    map(([recordings]) => this.mapState(recordings)),
    shareReplay(),
  );
  editable = new BehaviorSubject<Recording>({content: '', rate: 1});

  constructor(private config: ConfigService, private firebase: FirebaseService) {
    firebase.prerecordings.asObservable().subscribe((firebaseRecordings) => {
      if (firebaseRecordings) {
        const recordings = this.config.get<Recording[]>(this.recordingsKey) || []
        const contents = new Set(recordings.map(rec => rec.content));
        firebaseRecordings.forEach(content => {
          if (!contents.has(content)) {
            recordings.push({content});
          }
        });
        this.config.save(this.recordingsKey, recordings);
      }
    });
  }

  private mapState(recs: Recording[] | null): PrerecordingState {
    if (recs) {
      this.firebase.mergePrerecordings(recs.map(rec => rec.content));
    }
    return {
      recordings: recs || [],
      ready: true,
    };
  }

  save(recording: Recording) {
    const recordings = this.config.get<Recording[]>(this.recordingsKey) || [];
    recordings.push(recording);
    this.config.save(this.recordingsKey, recordings);
  }

  async edit(index: number, recording: Recording) {
    const recordings = this.config.get<Recording[]>(this.recordingsKey) || [];
    if (recordings[index].content === recording.content && recordings[index].rate === recording.rate) {
      return;
    }
    this.firebase.deletePrerecording(recordings[index].content);
    recordings[index] = recording;
    this.config.save(this.recordingsKey, recordings);
  }

  delete(index: number) {
    const recordings = this.config.get<Recording[]>(this.recordingsKey) || [];
    this.firebase.deletePrerecording(recordings[index].content);
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
