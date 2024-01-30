import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { PvEngine } from '@picovoice/web-voice-processor/src/types';
import { VuMeterEngine, WebVoiceProcessor } from '@picovoice/web-voice-processor';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faMicrophone, faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons';
import { NgClass, NgForOf, NgIf } from '@angular/common';

@Component({
  selector: 'app-record-button',
  standalone: true,
  imports: [
    FaIconComponent,
    NgIf,
    NgForOf,
    NgClass,
  ],
  templateUrl: './record-button.component.html',
  styleUrl: './record-button.component.scss',
})
export class RecordButtonComponent implements OnChanges {
  microphoneIcon = faMicrophone;
  microphoneDisabledIcon = faMicrophoneSlash;

  maxDb = 100;

  permissionDenied = false;
  started = false;
  buffer: Int16Array[] = [];
  engine: PvEngine;

  vuBars: number[] = [];
  vuMeterEngine = new VuMeterEngine((db) => this.vuMeterCallback(db));

  @Input()
  processing = false;

  @Output()
  recoding = new EventEmitter<boolean>();

  @Output()
  recorded = new EventEmitter<Int16Array>();

  constructor() {
    this.engine = {
      onmessage: (e) => {
        if (e.data.command === 'process') {
          this.buffer.push(e.data.inputFrame);
        }
      },
    };
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!!changes['processing'] && !changes['processing'].currentValue) {
      if (this.started) {
        this.started = false;
        this.stop();
      }
    }
  }

  vueBarIdentify(index: number) {
    return index;
  }

  vuMeterCallback(dB: number) {
    this.vuBars.push(Math.min(100, (100 + dB) / this.maxDb * 100));
    if (this.vuBars.length > 3) {
      this.vuBars.shift();
    }
  }

  async checkPermission() {
    try {
      await navigator.mediaDevices.getUserMedia(
        {
          audio: true,
          video: false,
        });
    } catch (e: any) {
      if ((e?.name == 'NotAllowedError') ||
        (e?.name == 'PermissionDismissedError')) {
        this.permissionDenied = true;
      }
      throw e;
    }
  }

  private async stop() {
    this.vuBars = [];
    this.buffer = [];

    this.recoding.emit(false);
    await WebVoiceProcessor.unsubscribe(this.engine);
    await WebVoiceProcessor.unsubscribe(this.vuMeterEngine);
  }

  async toggle() {
    if (this.processing) {
      return;
    }

    await this.checkPermission();

    if (this.permissionDenied) {
      return;
    }

    this.started = !this.started;

    if (this.started) {
      this.buffer = [];
      this.vuBars = [];

      await WebVoiceProcessor.subscribe(this.engine);
      await WebVoiceProcessor.subscribe(this.vuMeterEngine);

      this.recoding.emit(true);
    } else {

      let i = 0;
      const newBuffer = new Int16Array(this.buffer.length * 512);
      for (const buffer of this.buffer) {
        newBuffer.set(buffer, i * 512);
        i++;
      }

      await this.stop();
      this.recorded.emit(newBuffer);
    }
  }
}
