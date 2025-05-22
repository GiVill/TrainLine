import { Component, OnInit, signal, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Station } from '../../model/station ';
import { StationService } from '../../Services/station.service';


@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  private stationService = inject(StationService);

  showBackButton = input<boolean>(false);
  stationSelected = output<Station>();
  backToStations = output<void>();

  stations = signal<Station[]>([]);
  filteredStations = signal<Station[]>([]);
  searchTerm = signal<string>('');
  loading = signal<boolean>(true);
  error = signal<string>('');

  ngOnInit() {
    this.loadStations();
  }

  loadStations() {
    this.stationService.getStations().subscribe({
      next: (stations) => {
        this.stations.set(stations);
        this.filteredStations.set(stations);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Errore nel caricamento delle stazioni.');
        this.loading.set(false);
        console.error('Error loading stations:', err);
      }
    });
  }

  onSearchChange(term: string) {
    this.searchTerm.set(term);
    if (!term.trim()) {
      this.filteredStations.set(this.stations());
    } else {
      const filtered = this.stations().filter(station =>
        station.stop_name.toLowerCase().includes(term.toLowerCase()) ||
        station.zone_id.toString().includes(term)
      );
      this.filteredStations.set(filtered);
    }
  }

  onStationClick(station: Station) {
    this.stationSelected.emit(station);
  }

  onBackClick() {
    this.backToStations.emit();
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }
}
