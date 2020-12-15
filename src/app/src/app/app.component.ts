import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { routeChangeAnimation } from './app-route-change-animation';
import { ModalRefDirective } from './directives/modal-ref.directive';
import { Locale } from './model/Locale';
import { ModalService } from './services/modal.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [routeChangeAnimation],
})
export class AppComponent implements AfterViewInit {
  @ViewChild(ModalRefDirective) modalRef: ModalRefDirective;

  constructor(
    private translate: TranslateService,
    private modalService: ModalService
  ) {
    translate.setDefaultLang(Locale.EN);
  }

  ngAfterViewInit(): void {
    this.modalService.modalRef = this.modalRef;
  }

  getRouteAnimationState(outlet: RouterOutlet) {
    return (
      outlet &&
      outlet.activatedRouteData &&
      outlet.activatedRouteData['animation']
    );
  }

  get isModalOpen() {
    return this.modalService.isModalOpen();
  }
}
