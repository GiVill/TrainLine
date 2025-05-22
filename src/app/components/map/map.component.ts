import { Component, OnInit, OnDestroy, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Station } from '../../model/station ';
import { StationService } from '../../Services/station.service';


declare var L: any;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, OnDestroy {
  private stationService = inject(StationService);
  stationSelected = output<Station>();

  private map: any;
  private markers: any[] = [];
  stations: Station[] = [];
  loading = true;
  error = '';

  ngOnInit() {
    this.loadStations();
    this.initializeMap();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  loadStations() {
    this.stationService.getStations().subscribe({
      next: (stations) => {
        this.stations = stations;
        this.loading = false;
        this.addStationMarkers();
      },
      error: (err) => {
        this.error = 'Errore nel caricamento delle stazioni.';
        this.loading = false;
        console.error('Error loading stations:', err);
      }
    });
  }

  private initializeMap() {
    // Initialize map centered on Sardinia
    this.map = L.map('map').setView([40.1209, 9.0129], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  private addStationMarkers() {
    if (!this.map) return;

    this.stations.forEach(station => {
      try {
        const marker = L.marker([station.stop_lat, station.stop_lon])
          .bindPopup(`
            <div class="station-popup">
              <h3>${station.stop_name}</h3>
              <p>Zona: ${station.zone_id}</p>
              <p>Stato: <span class="status active">Attiva</span></p>
              <p>Tipo: Stazione Ferroviaria</p>
            </div>
          `)
          .on('click', () => {
            this.stationSelected.emit(station);
          });

        marker.addTo(this.map);
        this.markers.push(marker);
      } catch (error) {
        console.warn('Errore nell\'aggiunta del marcatore per', station.stop_name, error);
      }
    });

    // Load and add route shapes
    this.loadRoutes();
  }

  private loadRoutes() {
    this.stationService.getShapes().subscribe({
      next: (shapes) => {
        this.addRouteLines(shapes);
      },
      error: (err) => {
        console.error('Error loading routes:', err);
      }
    });
  }

  private addRouteLines(shapes: any[]) {
    if (!this.map) return;

    // Group shapes by shape_id
    const routeGroups: { [key: string]: any[] } = {};
    shapes.forEach(shape => {
      if (!routeGroups[shape.shape_id]) {
        routeGroups[shape.shape_id] = [];
      }
      routeGroups[shape.shape_id].push(shape);
    });

    // Draw route lines for each shape_id
    Object.keys(routeGroups).forEach(shapeId => {
      const routePoints = routeGroups[shapeId]
        .sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence)
        .map(point => [point.shape_pt_lat, point.shape_pt_lon]);

      if (routePoints.length > 1) {
        const polyline = L.polyline(routePoints, {
          color: '#dc3545',
          weight: 3,
          opacity: 0.8
        }).addTo(this.map);
      }
    });
  }
}
