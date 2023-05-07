import { Component } from '@angular/core';
import { ModalHandle, ModalInstance } from '../../modules/modal/modal.service';
import { ChanDaLiarService } from '../../states/chan-da-liar.service';
import { OpenAiService } from '../../states/open-ai.service';
import { AzureCognitiveService } from '../../states/azure-cognitive.service';
import { ConfigurationOpenaiSidebarComponent } from '../configuration-openai-sidebar/configuration-openai-sidebar.component';
import { ConfigurationAzureCognitiveSidebarComponent } from '../configuration-azure-cognitive-sidebar/configuration-azure-cognitive-sidebar.component';
import { DeviceService } from '../../states/device.service';
import { ConfigurationDeviceSidebarComponent } from '../configuration-device-sidebar/configuration-device-sidebar.component';
import { ConfigService } from 'src/app/config.service';
import {
  ConfigurationPrerecordingListSidebarComponent
} from '../configuration-prerecording-list-sidebar/configuration-prerecording-list-sidebar.component';
import { PrerecordingService } from '../../states/prerecording.service';
import { ConfigurationFirebaseComponent } from '../configuration-firebase-sidebar/configuration-firebase-sidebar.component';
import { FirebaseService } from 'src/app/states/firebase.service';
import {
  ConfigurationLightSidebarComponent
} from '../configuration-light-sidebar/configuration-light-sidebar.component';
import { LightService } from '../../states/light.service';

@Component({
  selector: 'app-configuration-sidebar',
  templateUrl: './configuration-sidebar.component.html',
  styleUrls: ['./configuration-sidebar.component.scss'],
})
export class ConfigurationSidebarComponent implements ModalInstance<void> {
  configurations = [
    {
      heading: 'Firebase',
      description: 'Database settings to persist settings',
      component: ConfigurationFirebaseComponent,
      state: this.firebase,
    },
    {
      heading: 'Devices',
      description: 'Configure Microphones and a Output Speaker',
      component: ConfigurationDeviceSidebarComponent,
      state: this.device,
    },
    {
      heading: 'Azure Cognitive',
      description: 'Configure API Keys and Voices',
      component: ConfigurationAzureCognitiveSidebarComponent,
      state: this.azureCognitive,
    },
    {
      heading: 'Open AI',
      description: 'Configure API Keys and Models',
      component: ConfigurationOpenaiSidebarComponent,
      state: this.openAI,
      classNames: ['fullscreen'],
    },
    {
      heading: 'Lights',
      description: 'Configure light controller',
      component: ConfigurationLightSidebarComponent,
      state: this.light,
    },
    {
      heading: 'Prerecordings',
      description: 'Configure prerecorded answers',
      component: ConfigurationPrerecordingListSidebarComponent,
      state: this.prerecording,
    },
  ];

  modal!: ModalHandle<void>;
  state$ = this.chanDaLiar.state$;

  constructor(
    private chanDaLiar: ChanDaLiarService,
    private openAI: OpenAiService,
    private device: DeviceService,
    private light: LightService,
    private prerecording: PrerecordingService,
    private azureCognitive: AzureCognitiveService,
    private firebase: FirebaseService,
    private config: ConfigService,
  ) {}

  dismiss() {
    this.modal.dismiss();
  }

  reset() {
    this.config.reset();
  }
}
