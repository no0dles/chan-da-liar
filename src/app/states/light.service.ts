import { Injectable } from '@angular/core';
import { combineLatest, map, shareReplay } from 'rxjs';
import { ConfigService } from '../config.service';
import { artnetLightServer, LightServer, shellyLightServer } from "./light-server";

export interface LightState {
  lightServer: LightServer | null
  serverIp: string | null
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
    map(([arnet]) =>
      this.mapState(arnet),
    ),
    shareReplay(),
  );

  setServerIp(ip: string) {
    this.config.save(this.arnetIp, ip);
  }

  private mapState(ip: string | null): LightState {
    return {
      ready: true,
      serverIp: ip,
      lightServer: !!ip && ip.length > 0 ? artnetLightServer(ip) : null,
    }
  }
}
