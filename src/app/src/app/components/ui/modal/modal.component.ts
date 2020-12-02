import { Component, EventEmitter, Output } from '@angular/core';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
})
export class ModalComponent {
  @Output() close: EventEmitter<void> = new EventEmitter();

  constructor(private settings: SettingsService) {}

  get isHebrewLocale() {
    return this.settings.isHebrewLocale;
  }
}
