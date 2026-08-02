import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';
import {
  FETCH_PATHS_URL,
  MILLIS_BETWEEN_API_CALLS,
  PATHS_TIMEOUT,
  PATHS_COUNT_URL,
  PATH_DETAILS_URL,
  PROFILES_COUNT_URL,
} from '../app.constants';
import { AuthService } from '../auth/auth.service';
import { SettingsService } from './settings.service';

import Path, { PathDetailsResponse } from '../model/Path';

interface PathServiceResponse {
  paths: Path[];
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

  isLoadingStatus: boolean;
  private relations: Path[] = [];
  private uniqueIds: Set<string> = new Set<string>();

  private pathsCount = 0;
  private prevTotal = 0;          // previous total-attempted count, to detect real backend progress
  private pathsCountTs = Date.now();

  // Set when the user stops a run early; halts the polling loop but keeps
  // whatever results have been gathered so far.
  private stopped = false;
  get wasStopped(): boolean { return this.stopped; }

  // Bumped on every reset() so that a superseded search's still-pending
  // callbacks/timeouts bail out instead of writing into the new run's results
  // (this is what caused a new target to show the previous target's paths).
  private runId = 0;
  private superseded(myRun: number): boolean { return myRun !== this.runId; }

  // Total profiles in the current target (project size, or 1 for a profile).
  // Already fetched for the progress logic; exposed so the results page can
  // show "found N of TOTAL". No extra query.
  private targetTotal = 0;
  get projectTotal(): number { return this.targetTotal; }

  constructor(private http: HttpClient, 
              private auth: AuthService,
              private settings: SettingsService) {
    this.auth.isAuthenticatedSubj.subscribe((isAuthenticated) => {
      if (isAuthenticated && this.status.value === Status.INITIALIZING) {
        this.search();
      }
    });
    this.status.subscribe((status) => {
      this.isLoadingStatus = !(status == Status.ERROR || status == Status.READY)
    });
  }

  // Halt the polling loop but keep the results already gathered.
  stop() {
    this.stopped = true;
    this.status.next(Status.READY);
  }

  search() {
    const myRun = this.runId;
    if (this.stopped) { this.status.next(Status.READY); return; }
    forkJoin(this.getCountQueriesObservables()).subscribe(
      ([
        { paths: relations },
        { count: pathsCount },
        { count: profilesCount },
        { count: totalPathsCount },
      ]) => {
        if (this.superseded(myRun)) { return; }
        if (this.stopped) { this.status.next(Status.READY); return; }
        this.targetTotal = profilesCount;

        if (totalPathsCount < profilesCount) {
          debugMessage('Reset / Source or target profiles are empty');
          this.triggerBackendWorkers();
        }

        if (this.notReady(pathsCount, totalPathsCount, profilesCount)) {
          debugMessage('Interval fetch enabled');
          this.filterStoreAndReturnFilteredRelations(relations);
          this.fetchAll(this.relations.length, myRun);
        } else {
          this.status.next(Status.READY);
        }
      },
      (reason) => {
        if (this.superseded(myRun)) { return; }
        console.error(reason);
        this.status.next(Status.ERROR);
      }
    );
  }

  reset() {
    this.relations = [];
    this.uniqueIds.clear();
    this.pathsCount = 0;
    this.prevTotal = 0;
    this.pathsCountTs = Date.now();
    this.targetTotal = 0;
    this.stopped = false;
    this.runId++;                       // supersede any in-flight search
    this.status.next(Status.INITIALIZING);

    let st = this.settings.getSourceTarget()
    let params = "";
    if (st.sourceId) {
      params = `?source_id=${st.sourceId}`
    }
    this.http.delete(FETCH_PATHS_URL + params).subscribe(() => {
      debugMessage('Reset connections - starting search again after a bit!');
      setTimeout(
        () => this.search(),
        2*MILLIS_BETWEEN_API_CALLS
      );
      
    }); 
  }

  startSearch() {
    this.triggerBackendWorkers();
  }

  private notReady(
    pathsCount: number,
    totalPathsCount: number,
    profilesCount: number
  ): boolean {
    // Give up only when the backend has made NO progress of any kind for the
    // timeout window — neither a new connection NOR a newly-attempted profile.
    // (Previously this only watched the connected count, so it stopped polling
    // while the crawl was still working through a big project, and a page
    // refresh was needed to catch up.)
    if (this.pathsCount == pathsCount && this.prevTotal == totalPathsCount
        && (Date.now() - this.pathsCountTs) > PATHS_TIMEOUT*1000  ) {
       return false; // backend has gone quiet and timed out, stop search
    }
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

  private fetchAll(offset: number, myRun: number): void {
    if (this.superseded(myRun)) { return; }
    if (this.stopped) { this.status.next(Status.READY); return; }
    this.status.next(Status.FETCHING);

    forkJoin(this.getCountQueriesObservables(offset)).subscribe(
      ([
        { paths: relations },
        { count: pathsCount },
        { count: profilesCount },
        { count: totalPathsCount },
      ]) => {
        if (this.superseded(myRun)) { return; }
        const filtered = this.filterStoreAndReturnFilteredRelations(relations);
        if (this.stopped) { this.status.next(Status.READY); return; }
        this.targetTotal = profilesCount;
        this.status.next(Status.PART_FETCHED);

        if (this.notReady(pathsCount, totalPathsCount, profilesCount)) {
          // Reset the "no progress" timer whenever EITHER the connected count or
          // the total-attempted count moves, so a still-working crawl keeps the
          // page polling instead of timing out mid-run.
          if (this.pathsCount != pathsCount || this.prevTotal != totalPathsCount) {
            this.pathsCount = pathsCount;
            this.prevTotal = totalPathsCount;
            this.pathsCountTs = Date.now();
          }
          setTimeout(
            () => this.fetchAll(this.relations.length, myRun),
            filtered.length > 0 ? 0 : MILLIS_BETWEEN_API_CALLS
          );
        } else {
          debugMessage('Interval fetch disabled');
          this.status.next(Status.READY);
        }
      },
      (reason) => {
        if (this.superseded(myRun)) { return; }
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
    let st = this.settings.getSourceTarget()

    return [
      this.http.get<PathServiceResponse>(FETCH_PATHS_URL, {
        params: { source_id: st.sourceId, offset: `${offset}` },
      }),
      this.http.get<PathsCountResponse>(PATHS_COUNT_URL,         
        {params: {source_id: st.sourceId}
      }),
      this.http.get<PathsCountResponse>(PROFILES_COUNT_URL, {
        params: {target_id: st.targetId}
      }),
      this.http.get<PathsCountResponse>(PATHS_COUNT_URL, {
        params: { source_id: st.sourceId, connected_only: 'false' },
      }),
    ];
  }

  private triggerBackendWorkers(): void {
    let st = this.settings.getSourceTarget()
    this.http.post(FETCH_PATHS_URL, {source_id: st.sourceId, target_id: st.targetId}).subscribe(() => {
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
  }): Observable<PathDetailsResponse> {
    return this.http.get<PathDetailsResponse>(`${PATH_DETAILS_URL}`, {
      params: { source_id, target_id },
    });
  }

  isLoading() {
    return this.isLoadingStatus;
  }
}

export enum Status {
  INITIALIZING,
  FETCHING,
  PART_FETCHED,
  READY,
  ERROR,
}
