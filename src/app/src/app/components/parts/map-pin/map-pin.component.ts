import { Component, Input, OnInit } from '@angular/core';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { MAP_PATH } from 'src/app/app.constants';

@Component({
  selector: 'app-map-pin',
  templateUrl: './map-pin.component.html',
  styleUrls: ['./map-pin.component.css'],
})
export class MapPinComponent implements OnInit {
  @Input() floor: string | number;
  @Input() large: boolean;
  @Input() targetId: string;

  constructor() {}

  ngOnInit(): void {}

  get mapPath() {
    return MAP_PATH;
  }

  get icon() {
    return faMapMarkerAlt;
  }
}
