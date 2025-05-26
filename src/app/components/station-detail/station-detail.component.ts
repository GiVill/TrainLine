import { Component, input, signal } from '@angular/core';
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
  
  // Stato per controllare se la sezione dettagliata è espansa
  isExpanded = signal(false);

  // Metodo per toggleare lo stato di espansione
  toggleExpanded() {
    this.isExpanded.set(!this.isExpanded());
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }
}