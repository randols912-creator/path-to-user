import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FETCH_PROFILE_URL, GENI_OAUTH_URL, PROJECT_DETAILS_URL } from '../app.constants';
import Profile from '../model/Profile';

export interface FetchProfilesResponse {
  results: Profile[];
  page?: number;
  next_page?: string;
  error?: {
    message: string;
    type: string;
  };
}

export interface ProjectDetailsResponse {
  project: {
    id: string;
    name: string;
  }
}


@Injectable({
  providedIn: 'root',
})
export class GeniService {
  constructor(private http: HttpClient) {}

  login(): void {
    window.location.href = GENI_OAUTH_URL;
  }

  /**
   * Fetch profiles data
   * @param ids of profiles to fetch, or empty to fetch current user profile
   * @param fields needed
   */
  fetchProfiles(
    ids?: string[],
    fields?: string[]
  ): Observable<FetchProfilesResponse> {
    const params: { ids?: string; fields?: string } = {};

    if (ids) {
      params.ids = ids.join(',');
    }

    if (fields) {
      params.fields = fields.join(',');
    }

    return this.http.get<FetchProfilesResponse>(FETCH_PROFILE_URL, {
      params,
    });
  }

  /**
   * Fetch profiles data
   * @param ids of profiles to fetch, or empty to fetch current user profile
   * @param fields needed
   */
   projectDetails(
    id: string  
    ): Observable<ProjectDetailsResponse> {
    const params: { id: string } = {id: id};

    return this.http.get<ProjectDetailsResponse>(PROJECT_DETAILS_URL, {
      params,
    });
  }
}
