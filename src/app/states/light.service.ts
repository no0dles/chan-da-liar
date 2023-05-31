import { Injectable } from '@angular/core';
import { combineLatest, debounceTime, map, shareReplay } from 'rxjs';
import { ConfigService } from '../config.service';

export interface LightState {
  artnetServerIp: string
  ready: boolean
}

@Injectable({providedIn: 'root'})
export class LightService {
  private arnetIp = 'artnet-ip';

  constructor(private config: ConfigService) {
  }

  state$ = combineLatest([
    this.config.watch<string>(this.arnetIp),
  ]).pipe(
    debounceTime(500),
    map(([arnet]) =>
      this.mapState(arnet),
    ),
    shareReplay(1),
  );

  setServerIp(ip: string) {
    this.config.save(this.arnetIp, ip);
  }

  private mapState(arnet: string | null): LightState {
    return {
      ready: true,
      artnetServerIp: arnet ?? 'http:///localhost:8080',
    }
  }
}
