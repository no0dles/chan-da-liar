import { Injectable } from '@angular/core';
import { combineLatest, debounceTime, map, shareReplay } from 'rxjs';
import { ConfigService } from '../config.service';
import { artnetLightServer, LightServer, shellyLightServer } from "./light-server";

export interface LightState {
  lightServer: LightServer | null
  serverAddress: string | null
  ready: boolean
}

@Injectable({providedIn: 'root'})
export class LightService {
  private arnetIp = 'light-server-address';

  constructor(private config: ConfigService) {}

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

  private mapState(ip: string | null): LightState {
    return {
      ready: true,
      serverAddress: ip,
      lightServer: !!ip && ip.length > 0 ? artnetLightServer(ip) : null,
    }
  }
}
