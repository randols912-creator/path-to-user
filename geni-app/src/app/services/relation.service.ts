import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { fetchRelationsUrl } from '../app.constants';
import Relation from '../model/Relation';

// TODO - strict type for source?
interface RelationServiceResponse {
  source: object;
  targets: Array<Relation>;
}

@Injectable({
  providedIn: 'root',
})
export class RelationService {
  private relations: Array<Relation> = [];
  private loading = true;
  private workersTriggered = false;

  constructor(private http: HttpClient) {}

  fetchAll(): void {
    this.http.get<RelationServiceResponse>(fetchRelationsUrl).subscribe(
      resp => {
        if (
          (!this.workersTriggered && !Object.keys(resp.source).length) ||
          !resp.targets.length
        ) {
          console.log(
            'Source or target profiles are empty. Backend workers triggered!'
          );
          this.triggerBackendWorkers();
        }

        this.relations = resp.targets;
      },
      reason => {
        console.error(reason);
      }
    );
  }

  triggerBackendWorkers(): void {
    this.workersTriggered = true;
    this.http.post(fetchRelationsUrl, {}).subscribe(resp => console.log(resp));
  }

  getRelations(): Array<Relation> {
    return this.relations;
  }
}
