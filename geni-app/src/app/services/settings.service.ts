import { Injectable } from '@angular/core';
import { appSettingsStorageKey } from '../app.constants';
import { RelationSortOrder } from '../pipes/relations-sort-by.pipe';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  constructor() {
    if (!localStorage.getItem(appSettingsStorageKey)) {
      this.setSortOrder(RelationSortOrder.DEFAULT);
    }
  }

  getSortOrder(): RelationSortOrder {
    return JSON.parse(localStorage.getItem(appSettingsStorageKey)).sort;
  }

  setSortOrder(orderKey: RelationSortOrder) {
    localStorage.setItem(
      appSettingsStorageKey,
      JSON.stringify({ sort: orderKey })
    );
  }
}
