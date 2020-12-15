import { Injectable } from '@angular/core';
import Connection from '../model/ProfileRelation';
import { GeniService } from './geni.service';

@Injectable({
  providedIn: 'root',
})
export class P2pService {
  // TODO fix me
  relatives: Connection[] = [
    {
      id: 'profile-55041592',
      url: 'https://www.geni.com/api/profile-55041592',
      name: 'Gregory Raginsky',
      relation: 'father',
    },
    {
      id: 'profile-55095154',
      url: 'https://www.geni.com/api/profile-55095154',
      name:
        'Lena Raginsky (\u0428\u0443\u043b\u044c\u043c\u0430\u043d/\u0420\u0430\u0433\u0438\u043d\u0441\u043a\u0430\u044f)',
      relation: 'mother',
    },
    {
      id: 'profile-34740690187',
      url: 'https://www.geni.com/api/profile-34740690187',
      name:
        '\u0425\u0430\u0438\u043c \u0428\u0443\u043b\u044c\u043c\u0430\u043d',
      relation: 'father',
    },
  ];

  constructor(private geni: GeniService) {
    // TODO fix me
    this.fetchProfiles(this.relatives.map((r) => r.id));
  }

  // TODO fix and me too
  private fetchProfiles(
    ids: string[],
    sucessCallback?: () => {},
    retryCallback?: () => void
  ) {
    this.geni
      .fetchProfiles(ids, [
        'id',
        'gender',
        'name',
        'names',
        'photo_urls',
        'birth',
        'death',
      ])
      .subscribe(
        (resp) => {
          const { results: profiles, error } = resp;
          if (!error) {
            profiles.forEach(
              (p) => (this.relatives.find((c) => c.id === p.id).profile = p)
            );

            if (sucessCallback) {
              sucessCallback();
            }
          } else {
            if (retryCallback) {
              setTimeout(retryCallback, 500);
            }
          }
        },
        (err) => {
          console.log(err);
        }
      );
  }
}
