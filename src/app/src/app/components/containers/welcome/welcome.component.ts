import {
  AfterViewInit,
  Component,
  ComponentFactoryResolver,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { homePath, termsOfUseUrl, welcomePhotos } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';
import { RefDirective } from 'src/app/directives/ref.directive';
import { ModalComponent } from '../../ui/modal/modal.component';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit, AfterViewInit {
  @ViewChild(RefDirective) refDir: RefDirective;
  @ViewChild('photosBox') photosBox: ElementRef;

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

  ngAfterViewInit() {
    setTimeout(() => {
      const { nativeElement: el } = this.photosBox;
      el.scrollLeft = 2000;
      el.classList.toggle('visible');
    }, 500)

    setTimeout(() => {
      const { nativeElement: el } = this.photosBox;
      el.scroll({ left: 0, top: 0, behavior: 'smooth' });
    }, 2000);
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
