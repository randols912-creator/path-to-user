import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import consts from '../constants';
import { RelationsResponse } from '../model/interfaces';
import { GeniService } from './geni.service';

@Injectable({
  providedIn: 'root',
})
export class RelationsService {
  constructor(private http: HttpClient, private geniService: GeniService) {}

  triggerWorkers() {
    return this.http.post(consts.findRelationsUrl, {});
  }

  findAll(): Observable<RelationsResponse> {
    return this.http.get<RelationsResponse>(consts.findRelationsUrl);
  }

  fetchDetails(profileId: string): Observable<any> {
    return new Observable(observer => {
      this.geniService.getDetails(profileId, relationDetails => {
        observer.next(relationDetails);
      });
    });
  }
}
