import { Component } from '@angular/core';
import { ModalHandle } from '../../modules/modal/modal.service';
import {
  DeviceService,
  MicrophoneMode,
  MicrophoneState,
} from '../../states/device.service';

@Component({
  selector: 'app-configuration-device-sidebar',
  templateUrl: './configuration-device-sidebar.component.html',
  styleUrls: ['./configuration-device-sidebar.component.scss'],
})
export class ConfigurationDeviceSidebarComponent {
  modal!: ModalHandle<void>;
  error = false;
  errorMessage = '';
  state$ = this.device.state$;

  constructor(private device: DeviceService) {}

  async requestPermission() {
    try {
      await navigator.mediaDevices.getUserMedia({audio: true})
      this.device.setPermission();
      this.error = false;
      this.errorMessage = '';
    } catch (err) {
      this.error = true;
      this.errorMessage = err as string;
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

  updateName(input: MicrophoneState, name: string) {
    this.device.updateName(input, name);
  }

  updateType(input: MicrophoneState, evt: Event) {
    const elm = evt.target as HTMLInputElement;
    if (!elm.checked) {
      return;
    }
    this.device.updateMode(input, elm.value as MicrophoneMode);
  }
}
