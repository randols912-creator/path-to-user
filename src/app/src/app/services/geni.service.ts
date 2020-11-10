import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GENI_API_URL, GENI_OAUTH_URL } from '../app.constants';
import Profile from '../model/Profile';

export interface FetchProfilesResponse {
  results: Profile[];
  page?: number;
  next_page?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GeniService {
  constructor(private http: HttpClient) {}

  login(): void {
    window.location.href = GENI_OAUTH_URL;
  }

  fetchProfile(profile: string, fields?: Array<string>): Observable<Profile> {
    return this.http.jsonp<Profile>(
      `${GENI_API_URL}/${profile}${
        fields ? '?fields=' + fields.join(',') : ''
      }`,
      'callback'
    );
  }

  fetchProfiles(
    ids: string[],
    fields?: Array<string>
  ): Observable<FetchProfilesResponse> {
    return this.http.jsonp<FetchProfilesResponse>(
      `${GENI_API_URL}/profile?ids=${ids.join(',')}${
        fields ? '&fields=' + fields.join(',') : ''
      }`,
      'callback'
    );
  }

  fetchProfileByLink(
    link: string,
    fields?: Array<string>
  ): Observable<Profile> {
    return this.http.jsonp<Profile>(
      `${link}${fields ? '?fields=' + fields.join(',') : ''}`,
      'callback'
    );
  }
}
