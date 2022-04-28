import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

import { ModalService } from 'src/app/services/modal.service';
import { P2pService } from 'src/app/services/p2p.service';
//import { P2pModalComponent } from '../p2p-modal/p2p-modal.component';
import { ProfilePopupComponent } from '../../pages/profile-popup/profile-popup.component';
import { SettingsService } from 'src/app/services/settings.service';


@Component({
  selector: 'app-p2p-button',
  templateUrl: './p2p-button.component.html',
  styleUrls: ['./p2p-button.component.css'],
})
export class P2pButtonComponent {
  constructor(private modal: ModalService,
              private p2p: P2pService,
              private router: Router, 
              private settings: SettingsService) {}

  showModalP2P(): void {
    //this.modal.open(ProfilePopupComponent);
    this.router.navigateByUrl('/profile_popup');
  }

  get newUsersCount() {
    return Object.keys(this.p2p.users).length;
  }

  get hasNewMessages() {
    return this.p2p.hasNewMessages;
  }

  get p2pEnabled() {
    return this.settings.getP2p();
  }

}
