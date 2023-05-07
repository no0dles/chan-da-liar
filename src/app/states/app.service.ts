import { Injectable } from "@angular/core";
import { ConfigService } from "../config.service";
import { Observable, combineLatest, map, mergeMap } from "rxjs";

export interface AppState {
  developer: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private configDeveloperKey = 'app-developer';

  state$: Observable<AppState> = combineLatest([
    this.config.watch<boolean>(this.configDeveloperKey, false),
  ]).pipe(
    map(([developer]) => ({
      developer: developer!,
    }))
  );

  setDeveloper(developer: boolean) {
    this.config.save(this.configDeveloperKey, developer);
  }

  constructor(private config: ConfigService) {}
}
