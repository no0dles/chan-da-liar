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

const baseLightValueIdle = 40;
const universe = 9
const channel = 13;
const baseLightValueSpeak = 30;

net.set(universe, channel, [baseLightValueIdle])

app.use(require('cors')())
app.use(require('body-parser').json())
app.post('', (req, res) => {
  for(const visum of transform(req.body.visums)) {
    setTimeout(() => {
      net.set(universe, channel, [visum.value+baseLightValueSpeak]);
    }, visum.offset)
  }

  setTimeout(() => {
    net.set(universe, channel, [baseLightValueIdle])
  }, req.body.visums[req.body.visums.length-1].offset + 100);


  res.status(200);
  res.end()
})
app.listen(8080, '0.0.0.0', console.log);
