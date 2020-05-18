import { BehaviorSubject, Observable, Subscription, interval } from 'rxjs';
import {
  fetchRelationsUrl,
  getRelationsCountUrl,
  millisBetweenBackendCalls,
} from '../app.constants';

import { AuthService } from '../auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Relation from '../model/Relation';

// TODO - strict type for source?
interface RelationServiceResponse {
  source: object;
  targets: Array<Relation>;
  is_not_ready: boolean;
}

const isEmptyUserProfile = (resp: RelationServiceResponse): boolean => {
  return !Object.keys(resp.source).length || !resp.targets.length;
};

@Injectable({
  providedIn: 'root',
})
export class RelationService {
  status = new BehaviorSubject<Status>(Status.INITIALIZING);
  private relations: Array<Relation> = [];
  private uniqueIds: Set<string> = new Set<string>();
  private interval$ = interval(millisBetweenBackendCalls);
  private intervalSub: Subscription;

  constructor(private http: HttpClient, private auth: AuthService) {
    this.http.get<RelationServiceResponse>(fetchRelationsUrl).subscribe(
      (resp) => {
        if (isEmptyUserProfile(resp)) {
          console.log('Source or target profiles are empty');
          this.triggerBackendWorkers();
        }

        if (resp.is_not_ready) {
          this.toggleIntervalFetch(true);
        }
      },
      (reason) => {
        console.error(reason);
        this.status.next(Status.ERROR);
      }
    );
  }

  private fetchAll(offset: number): void {
    this.http
      .get<RelationServiceResponse>(`${fetchRelationsUrl}?offset=${offset}`)
      .subscribe(
        (resp) => {
          if (
            this.intervalSub &&
            !this.intervalSub.closed &&
            !resp.is_not_ready
          ) {
            this.toggleIntervalFetch(false);
          }

          const newRelations = resp.targets.filter(
            (next) => !this.uniqueIds.has(next.id)
          );

          newRelations.forEach((next) => {
            this.uniqueIds.add(next.id);
            this.relations.push(next);
          });
        },
        (reason) => {
          this.status.next(Status.ERROR);
          this.toggleIntervalFetch(false);
          console.error(reason);
        }
      );
  }

  private triggerBackendWorkers(): void {
    this.http.post(fetchRelationsUrl, {}).subscribe(() => {
      console.log('Backend workers triggered!');
    });
  }

  private toggleIntervalFetch(enable: boolean): void {
    if (enable) {
      this.status.next(Status.FETCHING);
      this.intervalSub = this.interval$.subscribe(() => {
        this.fetchAll(this.relations.length);
      });
    } else {
      this.status.next(Status.READY);
      this.intervalSub.unsubscribe();
    }
    console.log(`Interval fetch ${enable === true ? 'enabled' : 'disabled'}`);
  }

  getRelation(id: string): Relation {
    const filtered = this.relations.filter((next) => next.id === id);
    return filtered && filtered[0];
  }

  getRelations(): Array<Relation> {
    return this.relations;
  }
}

export enum Status {
  INITIALIZING,
  FETCHING,
  READY,
  ERROR,
}
