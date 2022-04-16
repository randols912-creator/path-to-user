import { Pipe, PipeTransform } from '@angular/core';
import Path from '../model/Path';

@Pipe({
    name: 'relationsFilterBy',
    pure: false,
})
export class RelationsFilterByPipe implements PipeTransform {
    constructor() { }

    transform(
        relations: Path[],
        filter: any,
        limit: number = 0
    ): Path[] {
        if (!relations.length) {
            return relations;
        }

        var filteredRelations = relations;
        if (filter.gender) {
            filteredRelations = [...filteredRelations.filter((relation) => relation?.target_profile?.gender === filter.gender)].slice(0, limit);
        }

        if (filter.fromYear && filter.toYear) {
            filteredRelations = [...filteredRelations.filter((relation) => (relation?.target_profile?.birth?.date?.year >= filter.fromYear && relation?.target_profile?.birth?.date?.year <= filter.toYear))].slice(0, limit);
        }

        if (filter.country.length) {
            filteredRelations = [...filteredRelations.filter((relation) => {
                return filter.country.find((country) => country === relation?.target_profile?.birth?.location?.country)
            })].slice(0, limit);
            
        }

        if (filter.museum.length) {
            filteredRelations = [...filteredRelations.filter((relation) => {
                return filter.museum.find((floor) => floor === relation?.bh_floor)
            })].slice(0, limit);
        }

        if (filter.profession.length) {
            filteredRelations = [...filteredRelations.filter((relation) => {
                return filter.profession.find((theme) => theme === relation?.bh_theme)
            })].slice(0, limit);
        }

        console.log("Test", filteredRelations)
        return filteredRelations

    }
}