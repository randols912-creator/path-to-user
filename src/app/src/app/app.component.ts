import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { routeChangeAnimation } from './app-route-change-animation';
import { AuthService } from './auth/auth.service';
import { ModalRefDirective } from './directives/modal-ref.directive';
import { Locale } from './model/Locale';
import { ModalService } from './services/modal.service';
import { P2pService } from './services/p2p.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  animations: [routeChangeAnimation],
})
export class AppComponent implements AfterViewInit {
  @ViewChild(ModalRefDirective) modalRef: ModalRefDirective;

  constructor(
    private auth: AuthService,
    private translate: TranslateService,
    private modalService: ModalService,
    private p2p: P2pService
  ) {
    this.translate.setDefaultLang(Locale.EN);

    this.auth.isAuthenticatedSubj.subscribe((isAuthenticated) => {
      if (isAuthenticated) {
        if ('Notification' in window && Notification.permission !== 'granted') {
          Notification.requestPermission();
        }
      }
    });
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
