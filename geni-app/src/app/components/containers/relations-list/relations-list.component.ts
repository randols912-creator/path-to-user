import { Component, Input, OnInit } from '@angular/core';
import Relation from 'src/app/model/Relation';

@Component({
  selector: 'app-relations-list',
  templateUrl: './relations-list.component.html',
  styleUrls: ['./relations-list.component.css'],
})
export class RelationsListComponent implements OnInit {
  @Input() relations: Array<Relation>;

  constructor() {}

  ngOnInit(): void {}
}
