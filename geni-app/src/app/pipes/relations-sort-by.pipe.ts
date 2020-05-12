import { Pipe, PipeTransform } from '@angular/core';
import Relation from '../model/Relation';

const compareByProfileName = (a: Relation, b: Relation): number =>
  a.profile_name > b.profile_name ? 1 : -1;

const compareByStepCount = (a: Relation, b: Relation): number =>
  a.step_count > b.step_count ? 1 : -1;

@Pipe({
  name: 'relationsSortBy',
})
export class RelationsSortByPipe implements PipeTransform {
  constructor() {}

  transform(
    relations: Relation[],
    order: RelationSortOrder = RelationSortOrder.DEFAULT
  ): Relation[] {
    if (!relations.length) {
      return relations;
    }

    switch (order) {
      case RelationSortOrder.NAME:
        return [
          ...relations.sort((a: Relation, b: Relation) =>
            compareByProfileName(a, b)
          ),
        ];
      default:
        return [
          ...relations
            .filter((r) => r.step_count > 0)
            .sort((a: Relation, b: Relation) =>
              a.step_count === b.step_count
                ? compareByProfileName(a, b)
                : compareByStepCount(a, b)
            ),
          ...relations
            .filter((r) => r.step_count === 0)
            .sort((a: Relation, b: Relation) => compareByProfileName(a, b)),
        ];
    }
  }
}

export enum RelationSortOrder {
  DEFAULT,
  NAME,
  THEME,
  COUNTRY,
}
