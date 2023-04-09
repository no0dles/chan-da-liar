import {
  ComponentRef,
  Injectable,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { ModalComponent } from './modal/modal.component';
import { ModalSidebarComponent } from './modal-sidebar/modal-sidebar.component';
import { ModalConfirmComponent } from './modal-confirm/modal-confirm.component';

export type OmitByValue<T, ValueType> = Pick<
  T,
  { [Key in keyof T]-?: T[Key] extends ValueType ? never : Key }[keyof T]
  >;

export interface ModalInstance<T> {
  modal: ModalHandle<T>;
}

export type SidebarOrigin = 'right' | 'bottom';

export interface ModalHandle<T> {
  dismiss(res: T): void;
  viewContainerRef: ViewContainerRef;
}

@Injectable()
export class ModalService {
  private modalHandles: { resolver: () => void, handle: ModalHandle<any> }[] = [];

  constructor() {
    document.addEventListener('keydown', (evt) => {
      if (evt.key === 'Escape') {
        const handle = this.modalHandles.pop();
        if (handle) {
          handle.handle.dismiss(null);
          evt.stopPropagation()
        }
      }
    }, {capture: false});
  }

  private createHandle<T>(viewContainerRef: ViewContainerRef, componentRef: ComponentRef<any>, resolve: (value: T) => void): ModalHandle<T> {
    const handle: ModalHandle<T> = {
      viewContainerRef: viewContainerRef,
      dismiss: (res: T) => {
        this.removeHandle(handle);

        componentRef.destroy();
        resolve(res);
      },
    };

    return handle;
  }

  private removeHandle(handle: ModalHandle<any>) {
    const item = this.modalHandles.find(h => h.handle === handle);
    if (item) {
      this.modalHandles.splice(this.modalHandles.indexOf(item), 1);
    }
  }

  async confirm(viewContainerRef: ViewContainerRef, options: {
    title: string;
    subtitle?: string;
  }): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const componentRef = viewContainerRef.createComponent(ModalConfirmComponent);

      componentRef.instance.title = options.title;
      componentRef.instance.subtitle = options.subtitle;

      const handle = this.createHandle(viewContainerRef,componentRef, resolve);
      this.modalHandles.push({resolver: () => resolve(false), handle: handle});
      componentRef.instance.modal = handle;
    });
  }

  sidebar<T extends ModalInstance<R>, R>(
    viewContainerRef: ViewContainerRef,
    options: {
      title: string;
      classNames?: string[] | string;
      hideClose?: boolean;
      subtitle?: string;
      props?: Partial<OmitByValue<T, ModalInstance<any>>>;
      component: Type<T>,
      origin?: SidebarOrigin,
      canDismiss?: boolean
    },
  ): Promise<R | null> {
    return new Promise<R | null>((resolve) => {
      const componentRef = viewContainerRef.createComponent(ModalSidebarComponent);
      componentRef.instance.title = options.title;
      componentRef.instance.subtitle = options.subtitle;
      componentRef.instance.subtitle = options.subtitle;
      componentRef.instance.classNames = options.classNames ?? [];
      componentRef.instance.hideClose = options.hideClose;
      componentRef.instance.component = options.component;
      componentRef.instance.componentProps = options.props;
      componentRef.instance.canDismiss = options.canDismiss ?? true;
      componentRef.instance.origin = options.origin || 'right';

      const handle = this.createHandle(viewContainerRef, componentRef, resolve);
      this.modalHandles.push({ handle, resolver: () => resolve(null) });
      componentRef.instance.modal = handle;
    });
  }

  modal<T extends ModalInstance<R>, R>(
    viewContainerRef: ViewContainerRef,
    options: {
      title: string;
      classNames?: string[] | string;
      hideClose?: boolean;
      subtitle?: string;
      props?: Partial<OmitByValue<T, ModalInstance<any>>>;
      component: Type<T>,
    },
  ): Promise<R | null> {
    return new Promise<R | null>((resolve) => {
      const componentRef = viewContainerRef.createComponent(ModalComponent);

      componentRef.instance.title = options.title;
      componentRef.instance.subtitle = options.subtitle;
      componentRef.instance.subtitle = options.subtitle;
      componentRef.instance.hideClose = options.hideClose;
      componentRef.instance.component = options.component;
      componentRef.instance.classNames = options.classNames ?? [];
      componentRef.instance.componentProps = options.props;

      const handle = this.createHandle(viewContainerRef,componentRef, resolve);
      this.modalHandles.push({ handle, resolver: () => resolve(null) });
      componentRef.instance.modal = handle;
    });
  }
}
