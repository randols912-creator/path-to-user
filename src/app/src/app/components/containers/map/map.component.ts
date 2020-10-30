import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { profileUrl } from 'src/app/app.constants';
import Path from 'src/app/model/Path';
import { RelationService, Status } from 'src/app/services/relation.service';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';


@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('map') mapRef: ElementRef;
  relationsSub: Subscription;
  relation: Path;
  mapSrc: string;

  constructor(
    private relations: RelationService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const { snapshot: route } = this.route;
    const { target } = route.queryParams;

    this.relationsSub = this.relations.status.subscribe((status) => {
      if ([Status.PART_FETCHED, Status.READY].includes(status)) {
        const relation = this.relations.getRelation(target);
        relation && this.relationsSub?.unsubscribe();
        this.relation = relation;
      }
    });

    const { id } = route.params;
    console.log(id);
    this.mapSrc = `/assets/img/maps/floor${id}.jpg`;
  }

  ngOnDestroy(): void {
    this.relationsSub?.unsubscribe();
  }

  toggleMapZoom() {
    this.mapRef.nativeElement.classList.toggle('zoom-in');
  }

  get profileUrl() {
    return profileUrl;
  }

  get icon() {
    return faMapMarkerAlt;
  }
}
