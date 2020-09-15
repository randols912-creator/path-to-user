import {
  Component,
  ComponentFactoryResolver,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { homePath, welcomePhotos, termsOfUseUrl } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';
import { RefDirective } from 'src/app/directives/ref.directive';
import { SettingsService } from 'src/app/services/settings.service';
import { ModalComponent } from '../../ui/modal/modal.component';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit {
  @ViewChild(RefDirective) refDir: RefDirective;

  photos = welcomePhotos;
  agreeToTerms: boolean = false;
  agreeToConnectRelatives: boolean = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private resolver: ComponentFactoryResolver
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated) {
      this.router.navigate([homePath]);
    }
  }

  loginHandler(): void {
    this.authService.login();
  }

  get termsOfUseUrl() {
    return termsOfUseUrl;
  }

  showModalConnectWithRelatives(): void {
    const modalFactory = this.resolver.resolveComponentFactory(ModalComponent);
    const component = this.refDir.containerRef.createComponent(modalFactory);
    component.instance.close.subscribe(() => {
      this.refDir.containerRef.clear();
    });
  }
}
