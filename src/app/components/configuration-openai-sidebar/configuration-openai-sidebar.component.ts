import { Component } from '@angular/core';
import {ModalHandle} from '../../modules/modal/modal.service';
import {OpenAiService} from '../../states/open-ai.service';

@Component({
  selector: 'app-configuration-openai-sidebar',
  templateUrl: './configuration-openai-sidebar.component.html',
  styleUrls: ['./configuration-openai-sidebar.component.scss']
})
export class ConfigurationOpenaiSidebarComponent {
  modal!: ModalHandle<void>;
  state$ = this.openAi.state$;

  constructor(private openAi: OpenAiService) {
  }

  setKey(value: string) {
    this.openAi.setKey(value);
  }

  setModel(model: string) {
    this.openAi.setModel(model);
  }

}
