import {
  AfterViewInit,
  Component, ElementRef,
  HostListener,
  Type,
  ViewChild, ViewContainerRef
} from "@angular/core";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { ModalHandle, SidebarOrigin } from '../modal.service';

@Component({
  selector: 'common-modal-sidebar',
  templateUrl: './modal-sidebar.component.html',
  styleUrls: ['./modal-sidebar.component.scss'],
})
export class ModalSidebarComponent implements AfterViewInit {
  title!: string;
  subtitle?: string;
  classNames!: string | string[];
  hideClose?: boolean;

  component!: Type<any>;
  componentProps!: any;
  canDismiss!: boolean
  origin!: SidebarOrigin;
  modal!: ModalHandle<any>;
  closeIcon = faTimes;

  @ViewChild('modalContent', { read: ViewContainerRef })
  modalContent!: ViewContainerRef;

  @ViewChild('container')
  container?: ElementRef<HTMLDivElement>;

  dismiss(evt: MouseEvent): void {
    if (!this.canDismiss) {
      return;
    }

    if (!evt.target || !this.container) {
      return;
    }

    if (this.container.nativeElement.contains(evt.target as Node)) {
      return
    }
    this.modal.dismiss(null);
  }


  ngAfterViewInit(): void {
    Promise.resolve(null).then(() => {
      const componentRef = this.modalContent.createComponent(this.component);
      for (const key of Object.keys(this.componentProps || {})) {
        (componentRef.instance as any)[key] = (this.componentProps as any)[key];
      }
      componentRef.instance.modal = {
        viewContainerRef: this.modal.viewContainerRef,
        dismiss: (res: any) => {
          componentRef.destroy();
          this.modal.dismiss(res);
        },
      };
    });
  }
}
