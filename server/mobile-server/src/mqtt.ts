import mqtt from 'mqtt';
import { ShellyData } from './shelly-data';
import { CoIoTServer } from 'coiot-coap';

const devices = ['3494546E7D45'];
const mqttHost = process.env.MQTT_HOST || 'localhost';

const client = mqtt.connect(`mqtt://${mqttHost}:1883`);
client.on('connect', () => {
  console.log('mqtt connected');
});


export function sendToAllDevices(data: ShellyData) {
  try {
    for (const device of devices) {
      client.publish(`shellies/shellycolorbulb-${device}/color/0/set`, JSON.stringify(data));
    }
  } catch (e) {
    console.error(e);
  }
}


// detect shelly devices
// const server = new CoIoTServer();
// server.on('status', (status) => {
//   if (devices.indexOf(status.deviceId) === -1) {
//     devices.push(status.deviceId);
//     console.log('discovered', status.deviceId);
//   }
// });
//
// server.listen().then(() => {
//   console.log('CoIoT server listening');
// });
