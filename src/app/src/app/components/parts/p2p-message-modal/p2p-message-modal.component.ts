import { Component, EventEmitter, Output, Input } from '@angular/core';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-p2p-message-modal',
  templateUrl: './p2p-message-modal.component.html',
  styleUrls: ['./p2p-message-modal.component.css'],
})
export class P2pMessageModalComponent {
  @Output() closeModal: EventEmitter<void> = new EventEmitter();

  @Input() public messageText;
  @Input() public messageSender;

  constructor(
    private settings: SettingsService
    ) {}

  get isHebrewLocale() {
    return this.settings.isHebrewLocale;
  }
}
