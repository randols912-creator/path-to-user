import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'searchPipe'
})
export class SearchPipePipe implements PipeTransform {

  transform(items: any[], searchText: string): any[] {
    if (!items) { return []; }
    if (!searchText) { return items; }
    searchText = searchText.toLowerCase();
    return items.filter(item => {
      if (item && item.target_profile?.display_name) {
        return item.target_profile?.display_name.toLowerCase().includes(searchText);
      }
      return false;
    });
  }
}
