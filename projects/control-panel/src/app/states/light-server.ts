import { SpeakVisum } from "./azure-cognitive.service";

export interface LightServer {
  set(visums: SpeakVisum[]): void;
}

export function shellyLightServer(ip: string) {

  const baseLightValueIdleMin = 15;
  const baseLightValueIdleMax = 25;
  const baseLightValueSpeak = 40;

  let direction = 1;
  let currentIdle = baseLightValueIdleMin;

  let idle = true;
  async function idling() {
    currentIdle+=direction;
    if(currentIdle < baseLightValueIdleMin || currentIdle > baseLightValueIdleMax) {
      direction *= -1;
    }
    await setShellyColor(ip, currentIdle);
    idle && setTimeout(idling, 100);
  }

  idling();

  return {
    set(visums: SpeakVisum[]) {
      idle = false;
      for(const visum of transform(visums)) {
        setTimeout(() => {
          // https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/how-to-speech-synthesis-viseme?pivots=programming-language-csharp&tabs=visemeid#map-phonemes-to-visemes
          setShellyColor(ip, visum.value * baseLightValueSpeak);
        }, visum.offset);
      }

      setTimeout(() => {
        idle = true;
        idling();
      }, visums[visums.length-1].offset + 100);
    }
  }
}

async function setShellyColor(ip: string, value: number) {

  const query: {[key:string]: any} = {
    turn: 'on',
    red: 0,
    green: 0,
    blue: 0,
    white: value
  }

  await fetch(`${ip}/color/0?${Object.keys(query).map(key => `${key}=${query[key]}`).join('&')}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export function artnetLightServer(ip: string): LightServer {
  return {
    set(visums: SpeakVisum[]) {
      fetch(ip, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visums: visums,
        }),
      }).catch(e => {
        console.log('Could not send to light:', e.message);
      });
    }
  }
}

function linspace(from: number, to: number, steps: number) {
  const diff = to - from;
  const stepValue = diff / steps;
  return Array.from(Array(steps).keys()).map(i => from + i * stepValue)
}

function transform(data: SpeakVisum[]) {
  const result = [];
  const steps = 50;
  let last = {offset: 0, value: 0};
  for(const item of data) {
    let targetOffset = (item.offset - last.offset) / steps;
    for (const value of linspace(last.value, item.value, steps)) {
      result.push({
        offset: last.offset + targetOffset,
        value: mapValue(value),
      })
    }
    result.push({
      offset: item.offset,
      value: mapValue(item.value),
    })
  }
  return result;
}
function mapValue(num: number) {
  return num;
}
