const artnet = require('artnet')
const express = require('express');

require('pyextjs')

function transform(data) {
  const result = [];
  const steps = 50;
  let last = {offset: 0, value: 0};
  for(const item of data) {
    let targetOffset = (item.offset - last.offset) / steps;
    for (const value of numpy.linspace(last.value, item.value, steps)) {
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

function mapValue(num) {
  return num;
}

const net = artnet({
  host: '2.0.1.0',
})

const app = express();

const universe = 9
const channel = 13;


const baseLightValueIdleMin = 28;
const baseLightValueIdleMax = 31;
const baseLightValueSpeak = 30;

let idle = true;
function idling() {
  const value = Math.round(
    baseLightValueIdleMin + (baseLightValueIdleMax - baseLightValueIdleMin) * Math.random()
  );
  net.set(universe, channel, [value]);
  idle && setTimeout(idling, 10 + 50 * Math.random());
}
idling();

app.use(require('cors')())
app.use(require('body-parser').json())
app.post('', (req, res) => {
  const { visums } = req.body;
  idle = false;
  for(const visum of transform(visums)) {
    setTimeout(() => {
      // https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/how-to-speech-synthesis-viseme?pivots=programming-language-csharp&tabs=visemeid#map-phonemes-to-visemes
      net.set(universe, channel, [visum.value + baseLightValueSpeak]);
    }, visum.offset);
  }

  setTimeout(() => {
    idle = true;
    idling();
  }, visums[visums.length-1].offset + 100);


  res.status(200);
  res.end()
});

const PORT = 8080;
console.log('listening', PORT);
app.listen(PORT, '0.0.0.0', console.log);
