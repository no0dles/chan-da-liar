const express = require("express");
const { CoIoTServer, CoIoTClient } = require("coiot-coap");
const mqtt = require("mqtt");

const server = new CoIoTServer();
const devices = ['3494546E7D45'];

server.on("status", (status) => {
  if (devices.indexOf(status.deviceId) === -1) {
    devices.push(status.deviceId);
    console.log('discovered', status.deviceId);
  }
});

server.listen().then(() => {
  console.log("CoIoT server listening");
});

const client = mqtt.connect("mqtt://10.3.141.1:1883");

client.on("connect", () => {
  console.log("mqtt connected");
});

function sendToAllDevices(data) {
  for (const device of devices) {
    client.publish(`shellies/shellycolorbulb-${device}/color/0/set`, JSON.stringify({
      turn: "on",
      mode: "color", green: 0, red: 255, blue: 0, gain: currentIdle,
      brightness: 0, white: 0, temp: 4750, effect: 0, transition: 0
    }));
  }
}

const app = express();

const baseLightValueIdleMin = 15;
const baseLightValueIdleMax = 40;
const baseLightValueSpeak = 100;

let direction = 1;
let currentIdle = baseLightValueIdleMin;

let idle = true;

function idling() {
  currentIdle += direction;
  if (currentIdle < baseLightValueIdleMin || currentIdle > baseLightValueIdleMax) {
    direction *= -1;
  }

  sendToAllDevices({
    turn: "on",
    mode: "color", green: 255, red: 0, blue: 0, gain: currentIdle,
    brightness: 0, white: 0, temp: 4750, effect: 0, transition: 0
  })
  idle && setTimeout(idling, 100);
}

idling();

app.use(require("cors")());
app.use(require("body-parser").json());
app.post("", (req, res) => {
  const { visums } = req.body;
  idle = false;
  let promise = Promise.resolve();
  let offset = 0;
  console.log("received visum");
  for (const visum of visums) {
    promise = promise.then(() => {
      sendToAllDevices({
        turn: "on", mode: "color",
        green: 255, red: 0, blue: 0, gain: Math.min(100, visum.value * 3 + 40),
        brightness: 0, white: 0, temp: 4750,
        effect: 0, transition: 0
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
    console.log("idle");
    idle = true;
    idling();
  });


  res.status(200);
  res.end();
});

const PORT = 8080;
console.log("listening", PORT);
app.listen(PORT, "0.0.0.0", console.log);
