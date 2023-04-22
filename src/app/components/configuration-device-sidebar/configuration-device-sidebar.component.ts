import { Component } from '@angular/core';
import { ModalHandle } from '../../modules/modal/modal.service';
import {
  DeviceService,
  MicrophoneState,
} from '../../states/device.service';

@Component({
  selector: 'app-configuration-device-sidebar',
  templateUrl: './configuration-device-sidebar.component.html',
  styleUrls: ['./configuration-device-sidebar.component.scss'],
})
export class ConfigurationDeviceSidebarComponent {
  modal!: ModalHandle<void>;
  state$ = this.device.state$;

  constructor(private device: DeviceService) {}

  async requestPermission() {
    try {
      await navigator.mediaDevices.getUserMedia({audio: true})
      this.device.setPermission();
    } catch (err) {
      console.error(err);
    }
  }

  identify(index: number, item: MicrophoneState) {
    return item.deviceId;
  }

  setOutput(deviceId: string) {
    this.device.setOutput(deviceId);
  }

  toggleInput(input: MicrophoneState, evt: Event) {
    const elm = evt.target as HTMLInputElement;
    this.device.toggleInput(input, elm.checked);
  }

  updatePrefix(input: MicrophoneState, name: string) {
    this.device.updatePrefix(input, name);
  }
}
