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
import { getScrollPercentage } from './scroll-utils';
import { PaginationInstance } from 'ngx-pagination'
@Component({
  selector: 'app-relations-list',
  templateUrl: './relations-list.component.html',
  styleUrls: ['./relations-list.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class RelationsListComponent {
  @Input() relations: Array<Path>;
  @ViewChild('list') listRef: ElementRef;

  limit = INITIAL_RELATIONS_LIMIT;
  p: number = 1;
  @Input('data') meals: string[] = [];
  public config: PaginationInstance = {
    id: 'custom',
    itemsPerPage: 10,
    currentPage: 1
  };
  total: number;
  constructor(private settingsService: SettingsService) { }

  @HostListener('window:scroll', [])
  verticalScrollListener() {
    // if (getScrollPercentage() > RELATION_SCROLL_THRESHOLD_PCT) {
    //   this.limit += RELATION_LIMIT_STEP;
    // }
  }

  get sortOrder(): RelationSortOrder {
    this.total = Math.ceil((this.relations.length / 10))
    return this.settingsService.getSortOrder();
  }

  onPageChange(event) {
    this.config.currentPage = event;
  }

  onPageFirst(){
    this.config.currentPage = 1;
  }
}
