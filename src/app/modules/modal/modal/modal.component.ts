import {
  AfterViewInit,
  ApplicationRef,
  Component,
  ComponentFactoryResolver,
  ElementRef,
  EmbeddedViewRef,
  Injector,
  OnInit,
  Type,
  ViewChild,
} from '@angular/core';
import { ModalHandle } from '../modal.service';
import {faTimes} from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'common-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
})
export class ModalComponent implements OnInit, AfterViewInit {
  title!: string;
  subtitle?: string;
  classNames!: string | string[];
  hideClose?: boolean;

  component!: Type<any>;
  componentProps!: any;
  modal!: ModalHandle<any>;
  closeIcon = faTimes;

  @ViewChild('modalContent')
  modalContent!: ElementRef<HTMLElement>;

  constructor(
    private componentFactoryResolver: ComponentFactoryResolver,
    private appRef: ApplicationRef,
    private injector: Injector,
  ) {}


  dismiss(evt: MouseEvent): void {
    this.modal.dismiss(null);
  }

  preventBubbleUp(evt: MouseEvent) {
    evt.stopPropagation();
  }


  ngOnInit(): void {}

  ngAfterViewInit(): void {
    const componentRef = this.componentFactoryResolver.resolveComponentFactory(this.component).create(this.injector);

    for (const key of Object.keys(this.componentProps || {})) {
      (componentRef.instance as any)[key] = (this.componentProps as any)[key];
    }
    componentRef.instance.modal = {
      viewContainerRef: this.modal.viewContainerRef,
      dismiss: (res: any) => {
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
        this.modal.dismiss(res);
      },
    };

    this.appRef.attachView(componentRef.hostView);

    const domElem = (componentRef.hostView as EmbeddedViewRef<any>).rootNodes[0] as HTMLElement;

    this.modalContent.nativeElement.appendChild(domElem);
  }
}
