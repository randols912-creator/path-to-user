import { Component, Input, OnInit } from '@angular/core';
import Connection from 'src/app/model/ProfileRelation';

@Component({
  selector: 'app-connections-list',
  templateUrl: './connections-list.component.html',
  styleUrls: ['./connections-list.component.css'],
})
export class ConnectionsListComponent implements OnInit {
  @Input() connections: Array<Connection>;

  constructor() {}

  ngOnInit(): void {}
}
