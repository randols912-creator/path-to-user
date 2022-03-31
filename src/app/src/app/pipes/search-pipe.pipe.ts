import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'searchPipe'
})
export class SearchPipePipe implements PipeTransform {

  transform(items: any[], searchText: string, fieldName: string, name: string): any[] {
    if (!items) { return []; }
    if (!searchText) { return items; }
    searchText = searchText.toLowerCase();
    return items.filter(item => {
      if (item && item[fieldName][name]) {
        return item[fieldName][name].toLowerCase().includes(searchText);
      }
      return false;
    });
  }
}
