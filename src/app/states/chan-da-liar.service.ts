import { Injectable } from '@angular/core';
import { OpenAiService, OpenAIState } from './open-ai.service';
import {
  AzureCognitiveService,
  AzureCognitiveState,
} from './azure-cognitive.service';
import { combineLatest, map, shareReplay } from 'rxjs';
import { DeviceService, DeviceState, MicrophoneState } from './device.service';

export interface ChanDaLiarState {
  ready: boolean;
  microphones: MicrophoneState[];
  output: MediaDeviceInfo | null;
}

@Injectable({
  providedIn: 'root',
})
export class ChanDaLiarService {
  state$ = combineLatest([
    this.openAi.state$,
    this.azureCognitive.state$,
    this.device.state$,
  ]).pipe(
    map(([openAi, azureCognitive, device]) =>
      this.mapState(openAi, azureCognitive, device),
    ),
    shareReplay(),
  );

  constructor(
    private openAi: OpenAiService,
    private device: DeviceService,
    private azureCognitive: AzureCognitiveService,
  ) {}

  mapState(
    openAi: OpenAIState,
    azureCognitive: AzureCognitiveState,
    device: DeviceState,
  ): ChanDaLiarState {
    return {
      ready: openAi.ready && azureCognitive.ready && device.ready,
      output: device.selectedOutput,
      microphones: device.microphones.filter((m) => m.enabled),
    };
  }
}
