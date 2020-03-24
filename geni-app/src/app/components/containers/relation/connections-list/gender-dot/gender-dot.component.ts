import { Component, Input } from '@angular/core';
import { Gender } from 'src/app/model/Profile';

@Component({
  selector: 'app-gender-dot',
  templateUrl: './gender-dot.component.html',
  styleUrls: ['./gender-dot.component.css'],
})
export class GenderDotComponent {
  @Input() gender: Gender;
  @Input() inline: boolean;

  constructor() {}
}
