import { Injectable } from '@angular/core';
import {fromPromise} from 'rxjs/internal/observable/innerFrom';
import {ConfigService} from '../config.service';
import {combineLatest, map, mergeMap, shareReplay} from 'rxjs';

export interface DeviceState {
  outputs: MediaDeviceInfo[]
  inputs: MediaDeviceInfo[]

  microphones: MicrophoneState[]
  selectedOutput: MediaDeviceInfo | null
  ready: boolean
}

export interface MicrophoneState {
  name: string
  deviceId: string
  deviceName: string
  enabled: boolean
  mode: MicrophoneMode
}

export type MicrophoneMode = 'OpenAI' | 'Regie';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private outputKey = 'device-output-speaker'
  private microphoneKey = 'device-input-microphones'

  outputs$ = fromPromise(this.getOutputDevices())
  inputs$ = fromPromise(this.getInputDevices())

  state$ = combineLatest([
    this.inputs$,
    this.outputs$,
    this.config.watch<string>(this.outputKey),
    this.config.watch<MicrophoneState[]>(this.microphoneKey),
  ]).pipe(
    map(([inputs, outputs, outputId, microphones]) => this.mapState(inputs, outputs, outputId, microphones)),
    shareReplay()
  )

  constructor(private config: ConfigService) { }

  async getInputDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audioinput' && d.deviceId !== 'default');
  }

  async getOutputDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audiooutput' && d.deviceId !== 'default');
  }

  setOutput(deviceId: string) {
    this.config.save(this.outputKey, deviceId)
  }

  toggleInput(device: MicrophoneState, checked: boolean) {
    this.updateMicrophoneState(device, mic => {
      mic.enabled = checked;
    })
  }

  updateName(device: MicrophoneState, name: string) {
    this.updateMicrophoneState(device, mic => {
      mic.name = name;
    })
  }

  updateMode(device: MicrophoneState, mode: MicrophoneMode) {
    this.updateMicrophoneState(device, mic => {
      mic.mode = mode;
    })
  }

  private updateMicrophoneState(device: MicrophoneState, update: (state: MicrophoneState) => void) {
    const mics = this.config.get<MicrophoneState[]>(this.microphoneKey) || []
    let mic = mics.find(m => m.deviceId === device.deviceId);
    if (!mic) {
      mic = {
        enabled: device.enabled,
        name: device.name,
        deviceName: device.deviceName,
        deviceId: device.deviceId,
        mode: device.mode,
      }
      mics.push(mic)
    }

    update(mic);
    this.config.save(this.microphoneKey, mics);
  }

  private mapState(inputs: MediaDeviceInfo[], outputs: MediaDeviceInfo[], outputId: string | null, microphoneStates: MicrophoneState[] | null): DeviceState {
    const selectedOutput = outputs.find(o => o.deviceId === outputId) ?? null;

    const states: MicrophoneState[] = []
    for (const input of inputs) {
      const microphoneState = microphoneStates?.find(s => s.deviceId === input.deviceId)
      if (microphoneState) {
        states.push(microphoneState)
      } else {
        states.push({
          deviceId: input.deviceId,
          mode: 'OpenAI',
          enabled: true,
          deviceName: input.label,
          name: input.label,
        })
      }
    }

    return {
      inputs,
      outputs,
      selectedOutput,
      microphones: states,
      ready: !!selectedOutput && states.length > 0,
    }
  }
}
