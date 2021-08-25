import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import { PROFILE_PATH, QUADRANT_COUNT } from 'src/app/app.constants';
import Path from 'src/app/model/Path';
import { I18nService } from 'src/app/services/i18n.service';
import { RelationService } from 'src/app/services/relation.service';
import { SettingsService } from 'src/app/services/settings.service';

const getComputedStyleValue = (nativeElement: Element, key: string) => {
  return window.getComputedStyle(nativeElement)[key];
};

const calcElementDimensions = (nativeElement: Element) => {
  return [
    parseFloat(getComputedStyleValue(nativeElement, 'width')),
    parseFloat(getComputedStyleValue(nativeElement, 'height')),
  ];
};

const calcQuadrantDimensions = (mapWidth: number, mapHeight: number) => {
  return [mapWidth / QUADRANT_COUNT, mapHeight / QUADRANT_COUNT];
};

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements OnInit {
  @ViewChild('mapBox') mapBoxRef: ElementRef;
  @ViewChild('map') mapRef: ElementRef;
  @ViewChild('mapGrid') mapGridRef: ElementRef;
  @ViewChild('profilePin') profilePinRef: ElementRef;

  relation: BehaviorSubject<Path> = new BehaviorSubject(null);
  location: Location;
  floor: string;

  constructor(
    private relations: RelationService,
    private route: ActivatedRoute,
    private settings: SettingsService,
    private i18n: I18nService
  ) {}

  relationSericeStatusSub: Subscription;
  ngOnInit(): void {
    const { id: floorId } = this.route.snapshot.params;
    this.floor = floorId;

    this.relation.subscribe((r) => {
      if (r?.bh_location) {
        this.refreshLocation();
      }
    });
  }

  mapLoadedHandler(): void {
    const { snapshot: route } = this.route;
    const { target } = route.queryParams;

    const relation = this.relations.getRelation(target);
    if (!relation) {
      this.relations.fetchSingle(target).subscribe((r) => {
        this.relation.next(r);
      });
    } else {
      this.relation.next(relation);
    }
  }

  refreshLocation(): void {
    const { x, y } = this.calcMapScroll();
    this.location = { left: `${x}px`, top: `${y}px` };
  }

  placeGrid({
    mapBoxHeight,
    mapWidth,
    mapHeight,
    quadrantWidht,
    quadrantHeight,
  }) {
    console.debug('Placing grid');

    this.mapGridRef.nativeElement.style.top = `${
      mapBoxHeight > mapHeight ? (mapBoxHeight - mapHeight) / 2 : 0
    }px`;
    this.mapGridRef.nativeElement.style.height = `${mapHeight}px`;
    this.mapGridRef.nativeElement.style.width = `${mapWidth}px`;
    this.mapGridRef.nativeElement.style.backgroundSize = `${quadrantWidht}px ${quadrantHeight}px`;
  }

  toggleMapZoom() {
    const mapEl = this.mapRef?.nativeElement;
    const mapBoxEl = this.mapBoxRef?.nativeElement;

    mapEl.classList.toggle('zoom-in');
    if (mapEl.classList.contains('zoom-in')) {
      const { x, y, scrollXOffset, scrollYOffset } = this.calcMapScroll();
      mapBoxEl.scrollTo(x - scrollXOffset, y - scrollYOffset);
    }
    this.refreshLocation();
  }

  calcMapScroll() {
    const [x, y] = this.relation.value.bh_location.coordinates
      .split(',')
      .map((n) => +n);

    const [mapBoxWidth, mapBoxHeight] = calcElementDimensions(
      this.mapBoxRef?.nativeElement
    );
    const [mapWidth, mapHeight] = calcElementDimensions(
      this.mapRef.nativeElement
    );
    const [pinWidth, pinHeight] = calcElementDimensions(
      this.profilePinRef.nativeElement
    );

    const [quadrantWidht, quadrantHeight] = calcQuadrantDimensions(
      mapWidth,
      mapHeight
    );

    return {
      x:
        (mapBoxWidth > mapWidth ? (mapBoxWidth - mapWidth) / 2 : 0) +
        quadrantWidht * x -
        quadrantWidht / 2 -
        pinWidth / 2,
      y:
        (mapBoxHeight > mapHeight ? (mapBoxHeight - mapHeight) / 2 : 0) +
        quadrantHeight * y -
        quadrantHeight / 2 -
        pinHeight,
      scrollXOffset: mapBoxWidth / 2,
      scrollYOffset: mapBoxHeight / 2,
    };
  }

  get localizedFullname(): string {
    return this.i18n.extractProfileFullname(
      this.relation.value?.target_profile,
      this.settings.getLocale()
    );
  }

  get profileUrl() {
    return `/${PROFILE_PATH}`;
  }

  get profilePhoto() {
    return this.relation?.value?.target_profile?.photo_urls?.small;
  }

  get labelText() {
    return this.relation?.value?.bh_location?.name[this.settings.getLocale()];
  }

  get locale() {
    return this.settings.getLocale();
  }
}

interface Location {
  left: string;
  top: string;
}
