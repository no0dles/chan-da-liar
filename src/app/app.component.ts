import {Component, ViewChild} from '@angular/core';
import { AppMainComponent } from './app-main/app-main.component';
import { ModalService } from './modules/modal/modal.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {

  @ViewChild('main', { static: true }) appMainComponent?: AppMainComponent;


  constructor(
    private modal: ModalService
  ) {}

  ngOnInit() {
    this.modal.setViewContainerRef(this.appMainComponent!.viewContainerRef);
  }
 
}
