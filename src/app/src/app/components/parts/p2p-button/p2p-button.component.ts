import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ModalService } from 'src/app/services/modal.service';
import { P2pService } from 'src/app/services/p2p.service';
import { P2pModalComponent } from '../p2p-modal/p2p-modal.component';

@Component({
  selector: 'app-p2p-button',
  templateUrl: './p2p-button.component.html',
  styleUrls: ['./p2p-button.component.css'],
})
export class P2pButtonComponent {
  constructor(private modal: ModalService, private p2p: P2pService) {}

  showModalP2P(): void {
    this.modal.open(P2pModalComponent);
  }

  get newUsersCount() {
    return Object.keys(this.p2p.users).length;
  }

  get hasNewMessages() {
    return this.p2p.hasNewMessages;
  }

}
