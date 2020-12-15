import {
  Component,
  ElementRef,
  HostListener,
  Input,

  ViewChild
} from '@angular/core';
import {
  INITIAL_RELATIONS_LIMIT,
  RELATION_LIMIT_STEP,
  RELATION_SCROLL_THRESHOLD_PCT
} from 'src/app/app.constants';
import Path from 'src/app/model/Path';
import { RelationSortOrder } from 'src/app/pipes/relations-sort-by.pipe';
import { SettingsService } from 'src/app/services/settings.service';
import { getScrollPercentage } from './scroll-utils';

@Component({
  selector: 'app-relations-list',
  templateUrl: './relations-list.component.html',
  styleUrls: ['./relations-list.component.css'],
})
export class RelationsListComponent {
  @Input() relations: Array<Path>;
  @ViewChild('list') listRef: ElementRef;

  limit = INITIAL_RELATIONS_LIMIT;

  constructor(private settingsService: SettingsService) {}

  @HostListener('window:scroll', [])
  verticalScrollListener() {
    if (getScrollPercentage() > RELATION_SCROLL_THRESHOLD_PCT) {
      this.limit += RELATION_LIMIT_STEP;
    }
  }

  get sortOrder(): RelationSortOrder {
    return this.settingsService.getSortOrder();
  }
}
