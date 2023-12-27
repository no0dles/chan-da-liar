import { Injectable } from "@angular/core";
import { ConfigService } from "../config.service";
import { Observable, combineLatest, map, mergeMap } from "rxjs";

export interface AppState {
  overrideMode: boolean;
  livePresetEdit: boolean
}

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private configOverrideModeKey = 'app-override-mode';
  private configLivePresetEditKey = 'app-live-preset-edit';

  state$: Observable<AppState> = combineLatest([
    this.config.watch<boolean>(this.configOverrideModeKey, true),
    this.config.watch<boolean>(this.configLivePresetEditKey, true),
  ]).pipe(
    map(([overrideMode, livePresetEdit]) => ({
      overrideMode: !!overrideMode,
      livePresetEdit: !!livePresetEdit,
    }))
  );

  setLivePreset(value: boolean) {
    this.config.save(this.configLivePresetEditKey, value);
  }

  setOverrideMode(value: boolean) {
    this.config.save(this.configOverrideModeKey, value);
  }

  constructor(private config: ConfigService) {}
}
