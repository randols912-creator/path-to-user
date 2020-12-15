import { ComponentFactoryResolver, Injectable } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ModalRefDirective } from '../directives/modal-ref.directive';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  public modalRef: ModalRefDirective;
  private modal: any;

  constructor(
    private resolver: ComponentFactoryResolver,
    private router: Router
  ) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe(() => {
        if (this.modal) {
          this.modal.instance.closeModal.emit();
        }
      });
  }

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
