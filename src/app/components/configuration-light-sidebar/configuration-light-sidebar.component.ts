import { Component } from '@angular/core';
import { ModalHandle, ModalInstance } from '../../modules/modal/modal.service';
import { LightService } from '../../states/light.service';

@Component({
  selector: 'app-configuration-light-sidebar',
  templateUrl: './configuration-light-sidebar.component.html',
  styleUrls: ['./configuration-light-sidebar.component.scss']
})
export class ConfigurationLightSidebarComponent implements ModalInstance<void> {
  modal!: ModalHandle<void>;

  state$ = this.light.state$;

  constructor(private light: LightService) {}

  setServerIp(value: string) {
    this.light.setServerIp(value);
  }
}
