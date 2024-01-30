import { sendToAllDevices } from './mqtt';
import { clearTimeout } from 'node:timers';
import { SpeakVisum } from './speak';

const baseLightValueIdleMin = 15;
const baseLightValueIdleMax = 40;
const baseLightValueSpeak = 100;

export function lightController() {
  let direction = 2;
  let currentIdle = baseLightValueIdleMin;

  let mode: 'off' | 'speak' | 'idle' | 'listen' = 'off';
  let idleTimeout: NodeJS.Timeout | undefined;

  function idling() {
    currentIdle += direction;
    if (currentIdle < baseLightValueIdleMin || currentIdle > baseLightValueIdleMax) {
      direction *= -1;
    }

    sendToAllDevices({
      turn: 'on',
      mode: 'color',
      green: mode === 'idle' ? 150 : 255,
      red: 0,
      blue: 0,
      gain: currentIdle,
      brightness: 0,
      white: 0,
      temp: 4750,
      effect: 0,
      transition: 0,
    });

    if (mode === 'idle' || mode === 'listen') {
      idleTimeout = setTimeout(idling, 50);
    }
  }

  return {
    enable() {
      if (mode === 'off') {
        mode = 'idle';
        console.log('mode=idle');
        idling();
      }
    },
    listen() {
      if (mode === 'idle') {
        mode = 'listen';
        console.log('mode=listen')
      }
    },
    idle() {
      if (mode === 'listen' || mode === 'speak') {
        console.log('mode=idle')
        mode = 'idle';
        idling();
      }
    },
    speak(visums: SpeakVisum[]) {
      if (mode === 'off') {
        return;
      }

      let promise = Promise.resolve();
      let offset = 0;

      console.log('mode=speak')
      mode = 'speak';

      for (const visum of visums) {
        promise = promise.then(() => {
          sendToAllDevices({
            turn: 'on', mode: 'color',
            green: 255, red: 0, blue: 0,
            gain: Math.min(baseLightValueSpeak, visum.value * 3 + 40),
            brightness: 0, white: 0, temp: 4750,
            effect: 0, transition: 0,
          });

          return new Promise(resolve => {
            setTimeout(() => {
              offset = visum.offset;
              resolve();
            }, visum.offset - offset);
          });
        });
      }

      promise.then(() => {
        this.idle();
      });
    },
    disable() {
      if (mode === 'off') {
        return;
      }

      console.log('mode=off');
      mode = 'off';
      clearTimeout(idleTimeout);
    },
  };
}
