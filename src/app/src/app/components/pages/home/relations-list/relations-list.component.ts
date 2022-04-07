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
  @Input('data') meals: string[] = [];
  public config: PaginationInstance = {
    id: 'custom',
    itemsPerPage: 10,
    currentPage: 1
  };
  total: number;
  order: boolean = true;
  sortting: any[] = [];
  flag:boolean = false;
  public sortValue = JSON.parse(localStorage.getItem('app-settings'))
  pageSize: any;
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

  onchange(event) {
    this.pageSize = event.target.value;
   
  }
  

  sortData() {
    this.flag = true;
    if (this.sortValue.sort == 0) {
      if (this.order) {
        this.sortting = this.relations.sort((i, j) => (i.target_profile.last_name > j.target_profile.last_name ? -1 : 1));
      }
      else {
        this.sortting = this.relations.sort((i, j) => (i.target_profile.last_name > j.target_profile.last_name ? 1 : -1));
      }
      this.order = !this.order;
    } else if (this.sortValue.sort == 1) {
      if (this.order) {
        this.sortting = this.relations.sort((i, j) => (i.target_profile.last_name > j.target_profile.last_name ? -1 : 1));
      }
      else {
        this.sortting = this.relations.sort((i, j) => (i.target_profile.last_name > j.target_profile.last_name ? 1 : -1));
      }
      this.order = !this.order;
    } else if (this.sortValue.sort === 2) {
      if (this.order) {
        this.sortting = this.relations.sort((i, j) => i.target_profile.birth?.date?.year - j.target_profile.birth?.date?.year);
      }
      else {
        this.sortting = this.relations.sort((i, j) => j.target_profile.birth?.date?.year - i.target_profile.birth?.date?.year);
      }
      this.order = !this.order;
    } else if (this.sortValue.sort === 3) {
      if (this.order) {
        this.sortting = this.relations.sort((i, j) => i.target_profile.death?.date?.year - j.target_profile.death?.date?.year);
      }
      else {
        this.sortting = this.relations.sort((i, j) => j.target_profile.death?.date?.year - i.target_profile.death?.date?.year);
      }
      this.order = !this.order;
    } else if (this.sortValue.sort === 4) {
      if (this.order) {
        this.sortting = this.relations.sort((i, j) => i.step_count - j.step_count);
      }
      else {
        this.sortting = this.relations.sort((i, j) => j.step_count - i.step_count);
      }
      this.order = !this.order;
    }
  }
}
