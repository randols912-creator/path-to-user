import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { interval, Observable, Subscription } from 'rxjs';
import { fetchRelationsUrl, millisBetweenBackendCalls } from '../app.constants';
import Relation from '../model/Relation';

// TODO - strict type for source?
interface RelationServiceResponse {
  source: object;
  targets: Array<Relation>;
  workers_busy: boolean;
}

const isEmptyUserProfile = (resp: RelationServiceResponse): boolean => {
  return !Object.keys(resp.source).length || !resp.targets.length;
};

@Injectable({
  providedIn: 'root',
})
export class RelationService {
  private relations: Array<Relation> = [];
  private uniqueIds: Set<string> = new Set<string>();
  private interval$ = interval(millisBetweenBackendCalls);
  private intervalSub: Subscription;

  constructor(private http: HttpClient) {}

  init(): Observable<boolean> {
    return new Observable<boolean>(observer => {
      this.http.get<RelationServiceResponse>(fetchRelationsUrl).subscribe(
        resp => {
          this.relations = resp.targets.slice(0, 5); // TODO temp
          observer.next(isEmptyUserProfile(resp));
        },
        reason => {
          this.relations = [];
          observer.error(reason);
        }
      );
    });
  }

  setupNewUserProfile(): void {
    this.triggerBackendWorkers();
  }

  private fetchAll(): void {
    this.http.get<RelationServiceResponse>(fetchRelationsUrl).subscribe(
      resp => {
        if (
          this.intervalSub &&
          !this.intervalSub.closed &&
          !resp.workers_busy
        ) {
          this.toggleIntervalFetch(false);
        }

        resp.targets
          .filter(next => !this.uniqueIds.has(next.id))
          .forEach(next => {
            this.uniqueIds.add(next.id);
            this.relations.push(next);
          });
      },
      reason => {
        console.error(reason);
      }
    );
  }

  private triggerBackendWorkers(): void {
    console.log('Backend workers triggered!');
    this.http.post(fetchRelationsUrl, {}).subscribe(resp => {
      console.log(resp);
      this.toggleIntervalFetch(true);
    });
  }

  private toggleIntervalFetch(enable: boolean): void {
    if (enable) {
      this.intervalSub = this.interval$.subscribe(() => {
        this.fetchAll();
      });
    } else {
      this.intervalSub.unsubscribe();
    }
    console.log(`Interval fetch ${enable === true ? 'enabled' : 'disabled'}`);
  }

  getRelations(): Array<Relation> {
    return this.relations;
  }

  isLoading(): boolean {
    return;
  }
}
