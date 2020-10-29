import { Component, Input, OnInit } from '@angular/core';
import { faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-map-pin',
  templateUrl: './map-pin.component.html',
  styleUrls: ['./map-pin.component.css'],
})
export class MapPinComponent implements OnInit {
  @Input() floor: string | number;
  @Input() large: boolean;
  icon = faMapMarkerAlt;

  constructor() {}

  ngOnInit(): void {}
}
