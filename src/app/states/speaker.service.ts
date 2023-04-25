import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest } from 'rxjs';
import {AzureCognitiveService, SpeakVisum} from './azure-cognitive.service';
import { DeviceService } from './device.service';

export interface OutputQueueItem {
  source: string;
  content: string;
  playing: boolean;
  duration?: number;
  visums?: SpeakVisum[];
  resolve: () => void;
}
@Injectable({
  providedIn: 'root',
})
export class SpeakerService {

  private queueSubject = new BehaviorSubject<OutputQueueItem[]>([]);
  queue$ = this.queueSubject.asObservable();

  constructor(
    private device: DeviceService,
    private azureCognitive: AzureCognitiveService,
  ) {
    combineLatest([
      this.azureCognitive.state$,
      this.device.state$,
      this.queue$,
    ]).subscribe(([state, device, queue]) => {
      if (!state.speechConfig || !device.selectedOutput) {
        return;
      }

      const item = queue[0];
      if (!item) {
        return;
      }

      if (!item.playing) {
        item.playing = true;
        this.queueSubject.next(this.queueSubject.value);

        this.azureCognitive
          .speak(
            state.speechConfig,
            device.selectedOutput.deviceId,
            item.content,
          )
          .then((result) => {
            item.duration = result.duration;
            item.visums = result.visums;
            this.queueSubject.next(this.queueSubject.value);
            setTimeout(() => {
              const index = this.queueSubject.value.indexOf(item);
              if (index >= 0) {
                this.queueSubject.value.splice(index, 1);
                this.queueSubject.next(this.queueSubject.value);
              }
              item.resolve();
            }, result.duration);
          });
      }
    });
  }

  push(source: string, content: string) {
    return new Promise<void>(resolve => {
      this.queueSubject.value.push({
        playing: false,
        content,
        source,
        resolve,
      });
      this.queueSubject.next(this.queueSubject.value);
    })
  }

  remove(item: OutputQueueItem) {
    const index = this.queueSubject.value.indexOf(item);
    if (index === -1) {
      return;
    }
    if (item.playing) {
      return;
    }
    this.queueSubject.value.splice(index, 1);
  }
}
