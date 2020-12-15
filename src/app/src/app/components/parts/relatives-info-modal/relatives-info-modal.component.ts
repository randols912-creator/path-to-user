import { Component, EventEmitter, Output } from '@angular/core';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-relatives-info-modal',
  templateUrl: './relatives-info-modal.component.html',
  styleUrls: ['./relatives-info-modal.component.css'],
})
export class RelativesInfoModalComponent {
  @Output() closeModal: EventEmitter<void> = new EventEmitter();

  constructor(private settings: SettingsService) {}

  get isHebrewLocale() {
    return this.settings.isHebrewLocale;
  }
}
