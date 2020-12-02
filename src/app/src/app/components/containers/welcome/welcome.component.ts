import {
  AfterViewInit,
  Component,
  ComponentFactoryResolver,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HOME_PATH, termsOfUseUrl, welcomePhotos } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';
import { RefDirective } from 'src/app/directives/ref.directive';
import { SettingsService } from 'src/app/services/settings.service';
import { ModalComponent } from '../../ui/modal/modal.component';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit, AfterViewInit {
  @ViewChild(RefDirective) refDir: RefDirective;
  @ViewChild('photosBox') photosBox: ElementRef;

  loginForm: FormGroup;
  @ViewChild('agreeToTerms') termsRef: ElementRef;
  @ViewChild('agreeToConnectRelatives') relativesRef: ElementRef;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private resolver: ComponentFactoryResolver,
    private settings: SettingsService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      agreeToTerms: [false, Validators.requiredTrue],
      agreeToConnectRelatives: [true, Validators.requiredTrue],
    });

    if (this.authService.isAuthenticated) {
      this.router.navigate([HOME_PATH]);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      const { nativeElement: el } = this.photosBox;
      el.scrollLeft = 2000;
      el.classList.toggle('visible');
    }, 500);

    setTimeout(() => this.scrollPhotos(), 2500);
  }

  scrollPhotos() {
    const { nativeElement: el } = this.photosBox;
    el.scrollBy(-1, 0);

    if (el.scrollLeft > 0) {
      setTimeout(() => this.scrollPhotos(), 0);
    }
  }

  loginHandler(): void {
    if (this.loginForm.valid) {
      this.authService.login();
    } else {
      this.termsRef.nativeElement.classList.add('required');
      this.relativesRef.nativeElement.classList.add('required');
    }
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

  get photos() {
    return welcomePhotos;
  }

  get isHebrewLocale() {
    return this.settings.isHebrewLocale;
  }
}
