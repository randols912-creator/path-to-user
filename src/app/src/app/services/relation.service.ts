import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';
import {
  FETCH_PATHS_URL,
  MILLIS_BETWEEN_API_CALLS,
  PATHS_COUNT_URL,
  PATH_DETAILS_URL,
  PROFILES_COUNT_URL,
} from '../app.constants';
import Path, { PathDetailsResponse } from '../model/Path';

// TODO - strict type for source?
interface PathServiceResponse {
  paths: Array<Path>;
}

interface PathsCountResponse {
  count: number;
}

const debugMessage = (msg: string): void =>
  console.debug(`${new Date().toISOString()}: ${msg}`);

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
          debugMessage('Source or target profiles are empty');
          this.triggerBackendWorkers();
        }

        if (this.notReady(pathsCount, totalPathsCount, profilesCount)) {
          debugMessage('Interval fetch enabled');
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

    let relationsWasEmpty = this.relations.length === 0;
    filtered.forEach((next: Path) => {
      this.uniqueIds.add(next.target_id);
      this.relations.push(next);

      if (relationsWasEmpty) {
        debugMessage('First relation arrived');
        relationsWasEmpty = false;
      }
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
            filtered.length > 0 ? 0 : MILLIS_BETWEEN_API_CALLS
          );
        } else {
          debugMessage('Interval fetch disabled');
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
      this.http.get<PathServiceResponse>(FETCH_PATHS_URL, {
        params: { offset: `${offset}` },
      }),
      this.http.get<PathsCountResponse>(PATHS_COUNT_URL),
      this.http.get<PathsCountResponse>(PROFILES_COUNT_URL),
      this.http.get<PathsCountResponse>(PATHS_COUNT_URL, {
        params: { connected_only: 'false' },
      }),
    ];
  }

  private triggerBackendWorkers(): void {
    this.http.post(FETCH_PATHS_URL, {}).subscribe(() => {
      debugMessage('Backend workers triggered!');
    });
  }

  fetchSingle(id: string): Observable<Path> {
    return this.http.get<Path>(`${FETCH_PATHS_URL}/${id}`);
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
    return this.http.get<PathDetailsResponse>(`${PATH_DETAILS_URL}`, {
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
