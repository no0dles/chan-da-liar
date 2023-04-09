import {Injectable} from '@angular/core';
import {BehaviorSubject, combineLatest, of} from 'rxjs';
import {AzureCognitiveService} from './azure-cognitive.service';
import {DeviceService} from './device.service';

export interface OutputQueueItem {
  source: string;
  content: string;
  playing: boolean;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class SpeakerService {
  private queueSubject = new BehaviorSubject<OutputQueueItem[]>([]);
  queue$ = this.queueSubject.asObservable();

  constructor(private device: DeviceService, private azureCognitive: AzureCognitiveService) {
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

        this.azureCognitive.speak(state.speechConfig, device.selectedOutput.deviceId, item.content).then((duration) => {
          item.duration = duration;
          this.queueSubject.next(this.queueSubject.value);
          setTimeout(() => {
            const index = this.queueSubject.value.indexOf(item);
            if (index >= 0) {
              this.queueSubject.value.splice(index, 1);
              this.queueSubject.next(this.queueSubject.value);
            }
          }, duration);
        });
      }
    });
  }

  push(source: string, content: string) {
    this.queueSubject.value.push({
      playing: false,
      content,
      source,
    });
    this.queueSubject.next(this.queueSubject.value);
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
