import {Component, Input, OnInit, Type, ViewContainerRef} from '@angular/core';
import {ModalInstance, ModalService} from '../../modules/modal/modal.service';
import {
  ConfigurationOpenaiSidebarComponent,
} from '../configuration-openai-sidebar/configuration-openai-sidebar.component';
import {faCaretRight} from '@fortawesome/free-solid-svg-icons';
import {map, Observable} from 'rxjs';

export interface ReadyState {
  ready: boolean
}

export interface ReadyStateService {
  state$: Observable<ReadyState>
}

@Component({
  selector: 'app-configuration-item',
  templateUrl: './configuration-item.component.html',
  styleUrls: ['./configuration-item.component.scss'],
})
export class ConfigurationItemComponent implements OnInit {
  rightCaret = faCaretRight;

  @Input()
  heading!: string;

  @Input()
  description!: string;

  @Input()
  component!: Type<ModalInstance<void>>;

  @Input()
  state!: ReadyStateService;

  readyStatus$!: Observable<{ ready: boolean, label: string }>

  constructor(
    private viewContainerRef: ViewContainerRef,
    private modal: ModalService) {
  }

  ngOnInit() {
    this.readyStatus$ = this.state.state$.pipe(map(state => ({
      label: state.ready ? 'Ready' : 'Requires setup',
      ready: state.ready,
    })))
  }

  openSidebar() {
    return this.modal.sidebar(this.viewContainerRef, {
      component: this.component,
      title: this.heading,
      subtitle: this.description,
    });
  }

}
