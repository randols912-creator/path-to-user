import { Component, EventEmitter, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-predefined-messages',
  templateUrl: './predefined-messages.component.html',
  styleUrls: ['./predefined-messages.component.css'],
})
export class PredefinedMessagesComponent {
  @Output() predefinedMessageSelected = new EventEmitter();

  constructor(
    private translate: TranslateService,
    private settings: SettingsService
  ) {}

  selectPredefinedMessage(message: string): void {
    this.translate.get(message).subscribe((res: string) => {
      this.predefinedMessageSelected.emit(res);
    });
  }

  get isHebrewLocale(): boolean {
    return this.settings.isHebrewLocale;
  }
}
