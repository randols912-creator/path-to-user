import {
  Component,
  ElementRef,
  HostListener,
  Input,

  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {
  INITIAL_RELATIONS_LIMIT,
  RELATION_LIMIT_STEP,
  RELATION_SCROLL_THRESHOLD_PCT
} from 'src/app/app.constants';
import Path from 'src/app/model/Path';
import { RelationSortOrder } from 'src/app/pipes/relations-sort-by.pipe';
import { SettingsService } from 'src/app/services/settings.service';
import { PaginationInstance } from 'ngx-pagination'
import { getScrollPercentage } from '../scroll-utils';

@Component({
  selector: 'app-relations-list-desktop',
  templateUrl: './relations-list-desktop.component.html',
  styleUrls: ['./relations-list-desktop.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class RelationsListDesktopComponent {

  @Input() relations: Array<Path>;
  @ViewChild('list') listRef: ElementRef;

  limit = INITIAL_RELATIONS_LIMIT;
  @Input('data') meals: string[] = [];
  public config: PaginationInstance = {
    id: 'custom',
    itemsPerPage: 10,
    currentPage: 1
  };
  total: number;
  pageSize: any;
  constructor(private settingsService: SettingsService) { }

  @HostListener('window:scroll', [])
  verticalScrollListener() {
    if (getScrollPercentage() > RELATION_SCROLL_THRESHOLD_PCT) {
      this.limit += RELATION_LIMIT_STEP;
    }
  }

  get sortOrder(): RelationSortOrder {
    this.total = Math.ceil((this.relations.length / this.config.itemsPerPage))
    return this.settingsService.getSortOrder();
  }

  get filterOrder() {
    return this.settingsService.getFilterOrder();
  }

  get serachOrder() {
    return this.settingsService.getSerachOrder();
  }
  onPageChange(event) {
    this.config.currentPage = event;
  }

  onchange(event) {
    this.pageSize = event.target.value;
  }

  onPageFirst(){
    this.config.currentPage = 1;
  }
}
