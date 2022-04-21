import { Pipe, PipeTransform } from '@angular/core';
import Path from '../model/Path';

const compareByProfileName = (a: Path, b: Path): number =>
  `${a.target_profile.last_name || a.target_profile.maiden_name}${
    a.target_profile.first_name || a.target_profile.name
  }` >
  `${b.target_profile.last_name || b.target_profile.maiden_name}${
    b.target_profile.first_name || b.target_profile.name
  }`
    ? 1
    : -1;

const compareByFirstName = (a: Path, b: Path): number =>
a.target_profile.first_name > b.target_profile.first_name
      ? 1
      : -1;
    
const compareByStepCount = (a: Path, b: Path): number =>
  a.step_count > b.step_count ? 1 : -1;

const compareByBirthDate = (a: Path, b: Path): number =>
  a.target_profile.birth?.date?.year > b.target_profile.birth?.date?.year ? 1 : -1;

const compareByDeathDate = (a: Path, b: Path): number =>
  a.target_profile.death?.date?.year > b.target_profile.death?.date?.year ? 1 : -1;

@Pipe({
  name: 'relationsSortBy',
  pure: false,
})
export class RelationsSortByPipe implements PipeTransform {
  constructor() {}

  transform(
    relations: Path[],
    order: RelationSortOrder = RelationSortOrder.CONNECTIONS,
    limit: number = 0
  ): Path[] {
    if (!relations.length) {
      return relations;
    }

    switch (order) {
      case RelationSortOrder.FIRST_NAME:
        return [
          ...relations.sort((a: Path, b: Path) => compareByFirstName(a, b)),
        ];
      case RelationSortOrder.LAST_NAME:
        return [
          ...relations.sort((a: Path, b: Path) => compareByProfileName(a, b)),
        ];
      case RelationSortOrder.BIRTH_DATE:
        return [
          ...relations
            .filter((r) => r.target_profile.birth?.date?.year > 0)
            .sort((a: Path, b: Path) =>
              a.target_profile.birth?.date?.year === b.target_profile.birth?.date?.year
                ? compareByBirthDate(a, b)
                : compareByBirthDate(a, b)
            ),
          ...relations
            .filter((r) => r.target_profile.birth?.date?.year === 0)
            .sort((a: Path, b: Path) => compareByBirthDate(a, b)),
        ].slice(0, limit);
      case RelationSortOrder.DEATH_DATE:
        return [
          ...relations
            .filter((r) => r.target_profile.death?.date?.year > 0)
            .sort((a: Path, b: Path) =>
              a.target_profile.death?.date?.year === b.target_profile.death?.date?.year
                ? compareByDeathDate(a, b)
                : compareByDeathDate(a, b)
            ),
          ...relations
            .filter((r) => r.target_profile.death?.date?.year === 0)
            .sort((a: Path, b: Path) => compareByDeathDate(a, b)),
        ].slice(0, limit);
      default:
        return [
          ...relations
            .filter((r) => r.step_count > 0)
            .sort((a: Path, b: Path) =>
              a.step_count === b.step_count
                ? compareByProfileName(a, b)
                : compareByStepCount(a, b)
            ),
          ...relations
            .filter((r) => r.step_count === 0)
            .sort((a: Path, b: Path) => compareByProfileName(a, b)),
        ].slice(0, limit);
    }
  }
}

export enum RelationSortOrder {
  FIRST_NAME,
  LAST_NAME,
  BIRTH_DATE,
  DEATH_DATE,
  CONNECTIONS
}
