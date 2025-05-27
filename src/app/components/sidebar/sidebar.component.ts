import {
  Component,
  OnInit,
  signal,
  input,
  output,
  inject,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Station, PathSummary } from '../../model/models';
import { StationService } from '../../services/station.service';

/**
 * UI‑level helper: PathSummary con flag di espansione
 */
type Route = PathSummary & { expanded?: boolean };

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  /* ────────────────────────────────────────────────── Services */
  private stationService = inject(StationService);

  /* ────────────────────────────────────────────────── I/O */
  showBackButton = input<boolean>(false);
  stationSelected = output<Station>();
  stationFocused  = output<Station>();
  backToStations  = output<void>();
  routeSelected = output<string>();

  /* ────────────────────────────────────────────────── State */
  stations         = signal<Station[]>([]);
  routes           = signal<Route[]>([]);
  filteredStations = signal<Station[]>([]);
  filteredRoutes   = signal<Route[]>([]);
  loading          = signal<boolean>(true);
  error            = signal<string>('');

  /* Filtri */
  activeCategory = signal<'stations' | 'routes'>('stations');
  selectedZone   = signal<string>('all');   // "all" = nessun filtro
  searchTerm     = signal<string>('');

  // extra filtri legacy (opz.)
  zoneFilter  = signal<string>('');
  routeFilter = signal<string>('');

  /* ──────────────────────────────────────────── Computed values */
  /** elenco zone disponibili per drop‑down */
  availableZones = computed(() => {
    return Array.from(new Set(this.stations().map(s => s.zone_id))).sort();
  });

  /** la lista che il template deve visualizzare */
  filteredItems = computed(() =>
    this.activeCategory() === 'stations' ? this.filteredStations() : this.filteredRoutes()
  );

  /* ─────────────────────────────────────────── Lifecycle */
  ngOnInit(): void {
    /* 1. Stazioni */
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

    /* 2. Tratte (PathSummary) */
    this.stationService.getPathSummaries().subscribe({
      next: paths => {
        // aggiungi flag expanded=false
        const withFlags: Route[] = paths.map(p => ({ ...p, expanded: false }));
        this.routes.set(withFlags);
        this.applyFilters();
      },
      error: err => console.error('Error loading routes', err)
    });
  }

  /* ────────────────────────────────────────────  Filtri */
  onCategoryChange(category: 'stations' | 'routes') {
    this.activeCategory.set(category);
    this.applyFilters();
  }

  onZoneSelect(zone: string) {
    this.selectedZone.set(zone);
    this.applyFilters();
  }

  onSearchChange(term: string) {
    this.searchTerm.set(term);
    this.applyFilters();
  }

  // metodi legacy
  onZoneFilterChange(zone: string) {
    this.zoneFilter.set(zone);
    this.applyFilters();
  }

  onRouteFilterChange(routeId: string) {
    this.routeFilter.set(routeId);
    this.applyFilters();
  }

  clearFilters() {
    this.searchTerm.set('');
    this.selectedZone.set('all');
    this.zoneFilter.set('');
    this.routeFilter.set('');
    this.applyFilters();
  }

  /** applica entrambi i filtri */
  private applyFilters() {
    this.filterStations();
    this.filterRoutes();
  }

  private filterStations() {
    let result = this.stations();

    /* filtro zona attiva */
    if (this.selectedZone() !== 'all') {
      result = result.filter(s => s.zone_id === this.selectedZone());
    }

    /* ricerca testo */
    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      result = result.filter(s =>
        s.stop_name.toLowerCase().includes(term) ||
        s.zone_id.toLowerCase().includes(term)
      );
    }

    /* legacy: filtro zona */
    if (this.zoneFilter()) {
      result = result.filter(s => s.zone_id === this.zoneFilter());
    }

    /* legacy: filtro route → trova per stop_id */
    if (this.routeFilter()) {
      const route = this.routes().find(r => r.shapeId === this.routeFilter());
      if (route) {
        const allowedIds = new Set(route.stops.map(st => st.stop_id));
        result = result.filter(s => allowedIds.has(s.stop_id));
      }
    }

    this.filteredStations.set(result);
  }

  private filterRoutes() {
    let result = this.routes();

    /* filtro zona attiva */
    if (this.selectedZone() !== 'all') {
      result = result.filter(r => r.stops.some(s => s.zone_id === this.selectedZone()));
    }

    /* testo */
    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      result = result.filter(r =>
        r.name.toLowerCase().includes(term) ||
        r.origin.stop_name.toLowerCase().includes(term) ||
        r.destination.stop_name.toLowerCase().includes(term)
      );
    }

    this.filteredRoutes.set(result);
  }

  /* ────────────────────────────────────────────  Eventi UI */
  onStationClick(st: Station) {
    this.stationSelected.emit(st);
    this.stationFocused.emit(st);
  }

  onRouteClick(r: Route) {
    const updated = this.routes().map(route =>
      route.shapeId === r.shapeId ? { ...route, expanded: !route.expanded } : route
    );
    this.routes.set(updated);
    this.applyFilters();
    this.routeSelected.emit(r.shapeId);
  }

  onBackClick() {
    this.backToStations.emit();
  }

  /* permetti selezione esterna */
  public selectStation(station: Station) {
    this.onStationClick(station);
  }
}
