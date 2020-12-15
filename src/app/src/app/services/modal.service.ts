import { ComponentFactoryResolver, Injectable } from '@angular/core';
import { ModalRefDirective } from '../directives/modal-ref.directive';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  public modalRef: ModalRefDirective;
  private modal: any;

  constructor(private resolver: ComponentFactoryResolver) {}

  open(modalComponent: any) {
    const modalFactory = this.resolver.resolveComponentFactory<any>(
      modalComponent
    );
    if (!this.isModalOpen()) {
      this.modal = this.modalRef.containerRef.createComponent<any>(
        modalFactory
      );
      this.modal.instance.closeModal.subscribe(() => {
        this.modalRef.containerRef.clear();
        this.modal = undefined;
      });
    } else {
      this.modal.instance.closeModal.emit();
    }
  }

  isModalOpen(): boolean {
    return !!this.modal;
  }
}
