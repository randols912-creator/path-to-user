import {
  BehaviorSubject,
  Observable,
  Subject,
  Subscription,
  forkJoin,
} from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import {
  fetchPathsUrl,
  millisBetweenBackendCalls,
  pathDetailsUrl,
  pathsCountUrl,
  profilesCountUrl,
} from '../app.constants';

import { AuthService } from '../auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Path, { PathDetailsResponse } from '../model/Path';

// TODO - strict type for source?
interface PathServiceResponse {
  paths: Array<Path>;
}

interface PathsCountResponse {
  count: number;
}

@Injectable({
  providedIn: 'root',
})
export class RelationService {
  status = new BehaviorSubject<Status>(Status.INITIALIZING);
  private relations: Array<Path> = [];
  private uniqueIds: Set<string> = new Set<string>();

  constructor(private http: HttpClient) {
    forkJoin(this.getCountQueriesObservables()).subscribe(
      ([
        { paths: relations },
        { count: pathsCount },
        { count: profilesCount },
        { count: totalPathsCount },
      ]) => {
        if (!pathsCount) {
          console.log('Source or target profiles are empty');
          this.triggerBackendWorkers();
        }

        if (this.notReady(pathsCount, totalPathsCount, profilesCount)) {
          console.log('Interval fetch enabled');
          this.filterStoreAndReturnFilteredRelations(relations);
          this.fetchAll(this.relations.length);
        }
      },
      (reason) => {
        console.error(reason);
        this.status.next(Status.ERROR);
      }
    );
  }

  private notReady(
    pathsCount: number,
    totalPathsCount: number,
    profilesCount: number
  ): boolean {
    return (
      this.relations.length < pathsCount || totalPathsCount < profilesCount
    );
  }

  private filterStoreAndReturnFilteredRelations(relations: Path[]): Path[] {
    const filtered = relations.filter(
      (next: Path) => !this.uniqueIds.has(next.target_id)
    );

    filtered.forEach((next: Path) => {
      this.uniqueIds.add(next.target_id);
      this.relations.push(next);
    });

    return filtered;
  }

  private fetchAll(offset: number): void {
    this.status.next(Status.FETCHING);

    forkJoin(this.getCountQueriesObservables(offset)).subscribe(
      ([
        { paths: relations },
        { count: pathsCount },
        { count: profilesCount },
        { count: totalPathsCount },
      ]) => {
        const filtered = this.filterStoreAndReturnFilteredRelations(relations);
        this.status.next(Status.PART_FETCHED);

        if (this.notReady(pathsCount, totalPathsCount, profilesCount)) {
          setTimeout(
            () => this.fetchAll(this.relations.length),
            filtered.length > 0 ? 0 : millisBetweenBackendCalls
          );
        } else {
          console.log('Interval fetch disabled');
          this.status.next(Status.READY);
        }
      },
      (reason) => {
        this.status.next(Status.ERROR);
        console.error(reason);
      }
    );
  }

  private getCountQueriesObservables(
    offset: number = 0
  ): [
    Observable<PathServiceResponse>,
    Observable<PathsCountResponse>,
    Observable<PathsCountResponse>,
    Observable<PathsCountResponse>
  ] {
    return [
      this.http.get<PathServiceResponse>(fetchPathsUrl, {
        params: { offset: `${offset}` },
      }),
      this.http.get<PathsCountResponse>(pathsCountUrl),
      this.http.get<PathsCountResponse>(profilesCountUrl),
      this.http.get<PathsCountResponse>(pathsCountUrl, {
        params: { connected_only: 'false' },
      }),
    ];
  }

  private triggerBackendWorkers(): void {
    this.http.post(fetchPathsUrl, {}).subscribe(() => {
      console.log('Backend workers triggered!');
    });
  }

  getRelation(id: string): Path {
    return this.relations.filter((next) => next.target_id === id).shift();
  }

  getRelations(): Array<Path> {
    return [...this.relations];
  }

  fetchRelationDetails({
    source_id,
    target_id,
  }: Path): Observable<PathDetailsResponse> {
    return this.http.get<PathDetailsResponse>(`${pathDetailsUrl}`, {
      params: { source_id, target_id },
    });
  }
}

export enum Status {
  INITIALIZING,
  FETCHING,
  PART_FETCHED,
  READY,
  ERROR,
}
