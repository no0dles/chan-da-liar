import { Component } from '@angular/core';
import { ModalHandle } from '../../modules/modal/modal.service';
import { ConfigService } from '../../config.service';
import {
  AzureCognitiveService,
  AzureCognitiveState,
} from '../../states/azure-cognitive.service';
import { SpeakerService } from '../../states/speaker.service';

@Component({
  selector: 'app-configuration-azure-cognitive-sidebar',
  templateUrl: './configuration-azure-cognitive-sidebar.component.html',
  styleUrls: ['./configuration-azure-cognitive-sidebar.component.scss'],
})
export class ConfigurationAzureCognitiveSidebarComponent {
  apiKey?: string;
  region?: string;

  modal!: ModalHandle<void>;
  state$ = this.azureCognitive.state$;

  constructor(
    private config: ConfigService,
    private speaker: SpeakerService,
    private azureCognitive: AzureCognitiveService,
  ) {}

  setKey(key: string) {
    this.azureCognitive.setApiKey(key);
  }

  setRegion(region: string) {
    this.azureCognitive.setRegion(region);
  }

  setLocale(locale: string) {
    this.azureCognitive.setLocale(locale);
  }

  setVoice(voice: string) {
    this.azureCognitive.setVoice(voice);
  }

  play(state: AzureCognitiveState, text?: string) {
    if (!text) {
      console.warn('no text');
      return;
    }

    this.speaker.push('Azure Cognitive', text);
  }
}
