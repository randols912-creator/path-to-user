import { Directive, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[app-modal-ref]',
})
export class ModalRefDirective {
  constructor(public containerRef: ViewContainerRef) {}
}
