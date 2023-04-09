import { Injectable } from '@angular/core';
import { combineLatest, map, shareReplay } from 'rxjs';
import { ConfigService } from '../config.service';

export interface Recording {
  content: string;
}

export interface PrerecordingState {
  recordings: Recording[];
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

  constructor(private config: ConfigService) {}

  private mapState(recs: Recording[] | null): PrerecordingState {
    return {
      recordings: recs || [],
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
}
