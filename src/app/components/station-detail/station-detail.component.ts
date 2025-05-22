import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Station } from '../../model/models ';


@Component({
  selector: 'app-station-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.css']
})
export class StationDetailComponent {
  station = input.required<Station>();

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }
}
