import { Component, NgZone } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { io } from 'socket.io-client';
import { environment } from '../environments/environment';
import { RecordButtonComponent } from './record-button/record-button.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowDown } from '@fortawesome/free-solid-svg-icons';
import { NgClass, NgForOf, NgIf } from '@angular/common';

export interface StateMessage {
  role: 'user' | 'bot';
  content: string;
}

export type State = InitialState | RecordingState | ThinkingState | RunningState | CompletedState;

export interface InitialState {
  type: 'initial';
}

export interface RecordingState {
  type: 'recording';

  audioContext: AudioContext;

  messages: StateMessage[];
}

export interface ThinkingState {
  type: 'thinking';

  messages: StateMessage[];

  audioContext: AudioContext;
}

export interface RunningState {
  type: 'running';

  messages: StateMessage[];
  audioQueue: AudioQueueItem[];

  audioContext: AudioContext;
}

export interface AudioQueueItem {data: AudioBuffer, visums: any }

export interface CompletedState {
  type: 'completed';

  messages: StateMessage[];
  audioContext: AudioContext;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RecordButtonComponent, FaIconComponent, NgIf, NgForOf, NgClass],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  state: Readonly<State> = {
    type: 'initial',
    // type: 'completed',
    // audioContext: new AudioContext(),
    // messages: [
    //   { role: 'user', content: 'Wie ist das Wetter in Berlin?' },
    //   { role: 'bot', content: 'In Berlin ist es sonnig bei 20 Grad.' },
    //   { role: 'user', content: 'Danke' },
    // ],
  };

  arrowIcon = faArrowDown;

  socket = io(environment.socketUrl);

  constructor(private zone: NgZone) {
    this.socket.on('transcribed', (data: { text: string }) => {
      if (this.state.type !== 'initial') {
        this.state = {
          ...this.state,
          messages: [
            ...this.state.messages,
            { role: 'user', content: data.text },
          ],
        }
      }
    })
    this.socket.on('quite', () => {
      if (this.state.type === 'thinking') {
        this.state = {
          ...this.state,
          messages: [
            ...this.state.messages,
            { role: 'bot', content: '???' },
          ],
        }
      }
    })
    this.socket.on('response', (data: { audio: ArrayBuffer, text: string, visums: any }) => {
      if (this.state.type === 'thinking' || this.state.type === 'running') {
        this.state = {
          ...this.state,
          messages: [
            ...this.state.messages,
            { role: 'bot', content: data.text },
          ],
        }

        this.state.audioContext.decodeAudioData(data.audio, (decodedData) => {
          this.zone.run(() => {
            if (this.state.type === 'running') {
              this.state.audioQueue.push({data: decodedData, visums: data.visums});
            } else if (this.state.type === 'thinking') {
              this.state = {
                ...this.state,
                type: 'running',
                audioQueue: [],
              };
              this.play(this.state, {data: decodedData, visums: data.visums});
            }
          })
        });
      }
    });
  }

  play(ctx: RunningState, audio: AudioQueueItem) {
    const source = ctx.audioContext.createBufferSource();
    source.buffer = audio.data; // <==
    source.connect(ctx.audioContext.destination);
    source.start();
    this.socket.emit('speak', audio.visums);
    setTimeout(() => {
      const next = ctx.audioQueue.shift();
      if (next) {
        this.play(ctx, next);
      } else {
        this.state = {
          type: 'completed',
          audioContext: ctx.audioContext,
          messages: this.state.type === 'initial' ? [] : this.state.messages,
        };
      }
    }, audio.data.duration * 1000 );
  }

  startRecording() {
    this.state = {
      type: 'recording',
      audioContext: this.state.type === 'initial' ? new AudioContext() : this.state.audioContext,
      messages: this.state.type === 'initial' ? [] : this.state.messages,
    };
    this.socket.emit('recording');
  }

  recorded(data: Int16Array) {
    this.state = {
      type: 'thinking',
      audioContext: this.state.type === 'initial' ? new AudioContext() : this.state.audioContext,
      messages: this.state.type === 'initial' ? [] : this.state.messages,
    };
    this.socket.emit('ask', data.buffer);
  }
}
