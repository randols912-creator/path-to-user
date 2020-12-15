import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HOME_PATH, termsOfUseUrl, welcomePhotos } from 'src/app/app.constants';
import { AuthService } from 'src/app/auth/auth.service';
import { ModalService } from 'src/app/services/modal.service';
import { SettingsService } from 'src/app/services/settings.service';
import { RelativesInfoModalComponent } from '../../parts/relatives-info-modal/relatives-info-modal.component';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css'],
})
export class WelcomeComponent implements OnInit, AfterViewInit {
  @ViewChild('photosBox') photosBox: ElementRef;

  loginForm: FormGroup;
  @ViewChild('agreeToTerms') termsRef: ElementRef;
  @ViewChild('agreeToConnectRelatives') relativesRef: ElementRef;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private settings: SettingsService,
    private modal: ModalService
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
    this.modal.open(RelativesInfoModalComponent);
  }

  get photos() {
    return welcomePhotos;
  }

  get isHebrewLocale() {
    return this.settings.isHebrewLocale;
  }
}
