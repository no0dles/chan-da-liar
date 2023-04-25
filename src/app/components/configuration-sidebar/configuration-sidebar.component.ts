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

@Component({
  selector: 'app-configuration-sidebar',
  templateUrl: './configuration-sidebar.component.html',
  styleUrls: ['./configuration-sidebar.component.scss'],
})
export class ConfigurationSidebarComponent implements ModalInstance<void> {
  configurations = [
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
  ];

  modal!: ModalHandle<void>;
  state$ = this.chanDaLiar.state$;

  constructor(
    private chanDaLiar: ChanDaLiarService,
    private openAI: OpenAiService,
    private device: DeviceService,
    private azureCognitive: AzureCognitiveService,
    private config: ConfigService,
  ) {}

  dismiss() {
    this.modal.dismiss();
  }

  reset() {
    this.config.reset();
  }
}
