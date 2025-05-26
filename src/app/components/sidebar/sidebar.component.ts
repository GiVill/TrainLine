import {
  Component,
  OnInit,
  signal,
  input,
  output,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { Shape, Station } from '../../model/models ';
import { StationService } from '../../services/station.service';

interface Route {
  shape_id: string;
  stations_count: number;
  zones: string[];
  departure_station?: string;
  arrival_station?: string;
  distance_km?: number;
  expanded?: boolean; // Per gestire l'espansione
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  private stationService = inject(StationService);

  // Input/Output
  showBackButton = input<boolean>(false);
  stationSelected = output<Station>();
  stationFocused = output<Station>(); // Nuovo output per il focus sulla mappa
  backToStations  = output<void>();
  routeSelected = output<string>();

  // Dati e stati
  stations         = signal<Station[]>([]);
  filteredStations = signal<Station[]>([]);
  shapes           = signal<Shape[]>([]);
  routes           = signal<Route[]>([]);
  filteredRoutes   = signal<Route[]>([]);
  loading          = signal<boolean>(true);
  error            = signal<string>('');

  // Nuovi filtri per categoria e zona
  activeCategory   = signal<'stations' | 'routes'>('stations');
  selectedZone     = signal<string>('all');
  searchTerm       = signal<string>('');

  // Vecchi filtri (mantenuti per compatibilità)
  zoneFilter  = signal<string>('');
  routeFilter = signal<string>('');

  // Zone uniche disponibili
  availableZones = computed(() => {
    const zones = Array.from(new Set(this.stations().map(s => s.zone_id)))
      .sort((a, b) => a.localeCompare(b));
    return zones;
  });

  // Opzioni per i dropdown (mantenute per compatibilità)
  zoneOptions  = computed(() =>
    Array.from(new Set(this.stations().map(s => s.zone_id))).sort()
  );
  routeOptions = computed(() =>
    Array.from(new Set(this.shapes().map(sh => sh.shape_id))).sort()
  );

  // Computed per lista filtrata basata su categoria attiva
  filteredItems = computed(() => {
    if (this.activeCategory() === 'stations') {
      return this.filteredStations();
    } else {
      return this.filteredRoutes();
    }
  });

  ngOnInit() {
    // 1) Carica stazioni
    this.stationService.getStations().subscribe({
      next: stz => {
        this.stations.set(stz);
        this.applyFilters();
        this.loading.set(false);
      },
      error: err => {
        this.error.set('Errore nel caricamento delle stazioni.');
        this.loading.set(false);
        console.error(err);
      }
    });

    // 2) Carica shapes per filtro tratta
    this.stationService.getShapes().subscribe({
      next: shps => {
        this.shapes.set(shps);
        this.processRoutes(shps);
      },
      error: err => console.error('Error loading shapes', err)
    });
  }

  // Processa shapes per creare array di routes con stazioni di partenza e arrivo
  private processRoutes(shapes: Shape[]) {
    const routeMap = new Map<string, Route>();

    // Raggruppa shapes per shape_id
    const shapeGroups = new Map<string, Shape[]>();
    shapes.forEach(shape => {
      if (!shapeGroups.has(shape.shape_id)) {
        shapeGroups.set(shape.shape_id, []);
      }
      shapeGroups.get(shape.shape_id)!.push(shape);
    });

    // Processa ogni gruppo di shapes
    shapeGroups.forEach((shapePoints, shapeId) => {
      // Ordina i punti per sequence
      const sortedPoints = shapePoints.sort((a, b) => {
        // Assumendo che ci sia un campo per l'ordine, altrimenti usa un'euristica
        return (a.shape_pt_sequence || 0) - (b.shape_pt_sequence || 0);
      });

      // Trova le stazioni più vicine al primo e ultimo punto
      const firstPoint = sortedPoints[0];
      const lastPoint = sortedPoints[sortedPoints.length - 1];

      const departureStation = this.findNearestStation(firstPoint);
      const arrivalStation = this.findNearestStation(lastPoint);

      // Calcola distanza approssimativa
      const distance = this.calculateDistance(firstPoint, lastPoint);

      // Trova zone coinvolte
      const routeZones = new Set<string>();
      this.stations().forEach(station => {
        const hasNearbyPoint = sortedPoints.some(point =>
          Math.abs(point.shape_pt_lat - station.stop_lat) < 0.01 &&
          Math.abs(point.shape_pt_lon - station.stop_lon) < 0.01
        );
        if (hasNearbyPoint) {
          routeZones.add(station.zone_id);
        }
      });

      routeMap.set(shapeId, {
        shape_id: shapeId,
        stations_count: Math.floor(sortedPoints.length / 10),
        zones: Array.from(routeZones).sort(),
        departure_station: departureStation?.stop_name || 'Stazione di partenza',
        arrival_station: arrivalStation?.stop_name || 'Stazione di arrivo',
        distance_km: Math.round(distance * 10) / 10,
        expanded: false
      });
    });

    const routesArray = Array.from(routeMap.values());
    this.routes.set(routesArray);
    this.applyFilters();
  }

  // Trova la stazione più vicina a un punto
  private findNearestStation(point: Shape): Station | null {
    let nearestStation: Station | null = null;
    let minDistance = Infinity;

    this.stations().forEach(station => {
      const distance = Math.sqrt(
        Math.pow(station.stop_lat - point.shape_pt_lat, 2) +
        Math.pow(station.stop_lon - point.shape_pt_lon, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = station;
      }
    });

    return nearestStation;
  }

  // Calcola distanza approssimativa tra due punti (in km)
  private calculateDistance(point1: Shape, point2: Shape): number {
    const R = 6371; // Raggio della Terra in km
    const dLat = this.deg2rad(point2.shape_pt_lat - point1.shape_pt_lat);
    const dLon = this.deg2rad(point2.shape_pt_lon - point1.shape_pt_lon);
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(point1.shape_pt_lat)) * Math.cos(this.deg2rad(point2.shape_pt_lat)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  // Metodi per gestire i nuovi filtri
  onCategoryChange(category: 'stations' | 'routes') {
    this.activeCategory.set(category);
    this.applyFilters();
  }

  onZoneSelect(zone: string) {
    this.selectedZone.set(zone);
    this.applyFilters();
  }

  // Gestione ricerca
  onSearchChange(term: string) {
    this.searchTerm.set(term);
    this.applyFilters();
  }

  // Gestione filtro zona (vecchio metodo)
  onZoneFilterChange(zone: string) {
    this.zoneFilter.set(zone);
    this.applyFilters();
  }

  // Gestione filtro tratta (vecchio metodo)
  onRouteFilterChange(route: string) {
    this.routeFilter.set(route);
    this.applyFilters();
  }

  // Azzera tutti i filtri
  clearFilters() {
    this.searchTerm.set('');
    this.selectedZone.set('all');
    this.zoneFilter.set('');
    this.routeFilter.set('');
    this.applyFilters();
  }

  // Filtro principale combinato
  private applyFilters() {
    this.filterStations();
    this.filterRoutes();
  }

  // Filtra stazioni
  private filterStations() {
    let result = this.stations();

    // Filtro per zona selezionata
    if (this.selectedZone() !== 'all') {
      result = result.filter(s => s.zone_id === this.selectedZone());
    }

    // Filtro per ricerca
    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      result = result.filter(s =>
        s.stop_name.toLowerCase().includes(term) ||
        s.zone_id.toString().includes(term)
      );
    }

    // Filtri vecchi (per compatibilità)
    const z = this.zoneFilter();
    if (z) {
      result = result.filter(s => s.zone_id === z);
    }

    const r = this.routeFilter();
    if (r) {
      const stopsInRoute = new Set(
        this.shapes()
          .filter(sh => sh.shape_id === r)
          .map(sh => `${sh.shape_pt_lat.toFixed(6)},${sh.shape_pt_lon.toFixed(6)}`)
      );
      result = result.filter(s =>
        stopsInRoute.has(`${s.stop_lat.toFixed(6)},${s.stop_lon.toFixed(6)}`)
      );
    }

    this.filteredStations.set(result);
  }

  // Filtra routes
  private filterRoutes() {
    let result = this.routes();

    // Filtro per zona selezionata
    if (this.selectedZone() !== 'all') {
      result = result.filter(r => r.zones.includes(this.selectedZone()));
    }

    // Filtro per ricerca
    const term = this.searchTerm().toLowerCase().trim();
    if (term) {
      result = result.filter(r =>
        r.shape_id.toLowerCase().includes(term) ||
        r.zones.some(zone => zone.toLowerCase().includes(term)) ||
        r.departure_station?.toLowerCase().includes(term) ||
        r.arrival_station?.toLowerCase().includes(term)
      );
    }

    this.filteredRoutes.set(result);
  }

  // Gestione click su stazione - Modificato per supportare il focus sulla mappa
  onStationClick(s: Station) {
    // Emetti l'evento per selezionare la stazione
    this.stationSelected.emit(s);
    
    // Emetti anche l'evento per il focus sulla mappa
    this.stationFocused.emit(s);
  }

  // Gestione click su route (ora espande/contrae)
  onRouteClick(r: Route) {
    const currentRoutes = this.routes();
    const updatedRoutes = currentRoutes.map(route =>
      route.shape_id === r.shape_id
        ? { ...route, expanded: !route.expanded }
        : route
    );
    this.routes.set(updatedRoutes);
    this.applyFilters();
    
    // Aggiungi questa linea per emettere l'evento
    this.routeSelected.emit(r.shape_id);
  }

  // Gestione back button
  onBackClick() {
    this.backToStations.emit();
  }

  // Metodo pubblico per permettere la selezione esterna di una stazione
  public selectStation(station: Station) {
    this.onStationClick(station);
  }
}