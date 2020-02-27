import { Component, OnInit } from '@angular/core';
import { interval, Subject } from 'rxjs';
import consts from '../../constants';
import { RelationsResponse } from '../../model/interfaces';
import { RelationsService } from '../../services/relations.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
})
export class HomePageComponent implements OnInit {
  relationsStream$: Subject<RelationsResponse> = new Subject<
    RelationsResponse
  >();

  constructor(private relationsService: RelationsService) {}

  ngOnInit() {
    let workersTriggered = false;
    let relationsCount = 0;

    const interval$ = interval(consts.millisBetweenBackendCalls);
    const intervalSub = interval$.subscribe(() => {
      const findAllSubs = this.relationsService.findAll().subscribe(
        relationsData => {
          if (
            !workersTriggered &&
            (Object.keys(relationsData.source).length === 0 ||
              relationsData.targets.length === 0)
          ) {
            workersTriggered = true;
            console.log(
              'Source or target profiles are empty, backend workers are triggered!'
            );
            this.relationsService
              .triggerWorkers()
              .subscribe(resp => console.log(resp));
          }

          // TODO Do we need to stop on first fill?
          if (
            relationsCount > 0 &&
            relationsData.targets.length === relationsCount
          ) {
            console.log(
              'All profiles are set up, backend calls are suspended!'
            );
            intervalSub.unsubscribe();
            findAllSubs.unsubscribe();
            this.relationsStream$.complete();
          }

          relationsCount = relationsData.targets.length;
          this.relationsStream$.next(relationsData);
        },
        error => {
          intervalSub.unsubscribe();
          findAllSubs.unsubscribe();
          this.relationsStream$.error(
            'Backend not responding, calls are suspended!'
          );
        }
      );
    });
  }
}
