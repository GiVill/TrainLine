import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import stopsData from '../model/Data/stops.txt';
import shapesData from '../model/Data/shapes.txt';
import tripsData from '../model/Data/trips.txt';
import stopTimesData from '../model/Data/stop_times.txt';
import routesData from '../model/Data/routes.txt';

import { Station, Shape, Trip, StopTime, Route, PathSummary } from '../model/models';

@Injectable({
  providedIn: 'root'
})
export class StationService {

  /* ─────────────── dataset in memoria ─────────────── */
  private readonly stations: Station[]   = this.parseStations();
  private readonly shapes: Shape[]       = this.parseShapes();
  private readonly trips: Trip[]         = this.parseTrips();
  private readonly stopTimes: StopTime[] = this.parseStopTimes();
  private readonly routes: Route[]       = this.parseRoutes();

  /**
   * PathSummary deduplicati e già filtrati (escludiamo i BUS)
   */
  private readonly pathSummaries: PathSummary[] = this.buildPathSummaries();

  /* ─────────────── API pubbliche ─────────────── */
  getStations(): Observable<Station[]> {
    return of(this.stations);
  }

  getStationById(stopId: string): Observable<Station | undefined> {
    return of(this.stations.find(s => s.stop_id === stopId));
  }

  /** Restituisce tutte le polilinee raw (non filtrate) */
  getShapes(): Observable<Shape[]> {
    return of(this.shapes);
  }

  /** Tratte pronte per la UI (niente BUS) */
  getPathSummaries(): Observable<PathSummary[]> {
    return of(this.pathSummaries);
  }

  /* ============================================================ */
  /* =====================   PARSING CSV   ====================== */
  /* ============================================================ */

  private parseStations(): Station[] {
    const objects = this.parseCSV(stopsData);
    return objects.map(o => ({
      stop_id:            o.stop_id.replace(/"/g,''),
      stop_code:          o.stop_code.replace(/"/g,''),
      stop_name:          o.stop_name.replace(/"/g,''),
      stop_desc:          o.stop_desc.replace(/"/g,''),
      stop_lat:           parseFloat(o.stop_lat),
      stop_lon:           parseFloat(o.stop_lon),
      zone_id:            o.zone_id,
      stop_url:           o.stop_url,
      location_type:      o.location_type,
      parent_station:     o.parent_station,
      stop_timezone:      o.stop_timezone,
      wheelchair_boarding: o.wheelchair_boarding,
      level_id:           o.level_id,
      platform_code:      o.platform_code
    }));
  }

  private parseShapes(): Shape[] {
    const objects = this.parseCSV(shapesData);
    return objects.map(o => ({
      shape_id:           o.shape_id.replace(/"/g, ''),
      shape_pt_lat:       parseFloat(o.shape_pt_lat),
      shape_pt_lon:       parseFloat(o.shape_pt_lon),
      shape_pt_sequence:  parseInt(o.shape_pt_sequence, 10),
      shape_dist_traveled: o.shape_dist_traveled
    }));
  }

  private parseTrips(): Trip[] {
    const objects = this.parseCSV(tripsData);
    return objects.map(o => ({
      trip_id:      o.trip_id,
      route_id:     o.route_id,
      shape_id:     o.shape_id,
      direction_id: Number(o.direction_id)
    }));
  }

  private parseStopTimes(): StopTime[] {
    const objects = this.parseCSV(stopTimesData);
    return objects.map(o => ({
      trip_id:       o.trip_id,
      stop_id:       o.stop_id,
      stop_sequence: Number(o.stop_sequence)
    }));
  }

  /**
   * ROUTE: ora includiamo anche `route_type` per capire il modo (3 = BUS)
   */
  private parseRoutes(): Route[] {
    const objects = this.parseCSV(routesData);
    return objects.map(o => ({
      route_id:         o.route_id,
      route_short_name: o.route_short_name,
      route_long_name:  o.route_long_name,
      route_color:      o.route_color,
      route_type:       o.route_type   // <── NEW
    }));
  }

  /** Parsing CSV generico in array di record */
  private parseCSV(data: string): any[] {
    const lines = data.split(/\r?\n/).filter(l => l.trim().length > 0);
    const [header, ...rows] = lines;
    const cols = this.parseCSVLine(header).map(c => c.replace(/"/g, ''));

    return rows.map(row => {
      const vals = this.parseCSVLine(row);
      return cols.reduce((acc, col, i) => ({ ...acc, [col]: vals[i] ?? '' }), {} as any);
    });
  }

  private parseCSVLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { out.push(cur); cur=''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }

  /* ============================================================ */
  /* ============   COSTRUISCI PATH SUMMARY   =================== */
  /* ============================================================ */

  private buildPathSummaries(): PathSummary[] {
    /* indicizza stop_times per trip */
    const stopTimesByTrip = new Map<string, StopTime[]>();
    this.stopTimes.forEach(st => {
      const list = stopTimesByTrip.get(st.trip_id) ?? [];
      list.push(st);
      stopTimesByTrip.set(st.trip_id, list);
    });

    /* trip rappresentativi per shape */
    const repTrip = new Map<string, Trip>();
    this.trips.forEach(t => {
      if (!repTrip.has(t.shape_id)) repTrip.set(t.shape_id, t);
    });

    /* shape points indicizzati */
    const shapesById = new Map<string, Shape[]>();
    this.shapes.forEach(s => {
      const arr = shapesById.get(s.shape_id) ?? [];
      arr.push(s);
      shapesById.set(s.shape_id, arr);
    });
    shapesById.forEach(a => a.sort((a,b)=>a.shape_pt_sequence-b.shape_pt_sequence));

    const summaries: PathSummary[] = [];

    repTrip.forEach((trip, shapeId) => {
      /* filtro: salta BUS (route_type 3) */
      const routeInfo = this.routes.find(r => r.route_id === trip.route_id);
      if (routeInfo && routeInfo.route_type === '3') return;   // skip bus lines

      const orderedStops = (stopTimesByTrip.get(trip.trip_id) ?? [])
        .sort((a,b)=>a.stop_sequence-b.stop_sequence)
        .map(st => this.stations.find(s=>s.stop_id===st.stop_id))
        .filter((s): s is Station => !!s);
      if (!orderedStops.length) return;

      const origin = orderedStops[0];
      const destination = orderedStops[orderedStops.length-1];
      const name = `${routeInfo?.route_short_name || trip.route_id} ${origin.stop_name} → ${destination.stop_name}`;

      summaries.push({
        shapeId,
        routeId: trip.route_id,
        name,
        origin,
        destination,
        stops: orderedStops,
        shape: shapesById.get(shapeId) ?? []
      });
    });

    /* DEDUPLICA: stessa linea, stessa origine/destinazione */
    const byKey = new Map<string, PathSummary>();
    summaries.forEach(s => {
      const k = `${s.routeId}|${s.origin.stop_id}|${s.destination.stop_id}`;
      const prev = byKey.get(k);
      if (!prev || s.stops.length > prev.stops.length) {
        byKey.set(k, s);
      }
    });

    return Array.from(byKey.values()).sort((a,b)=>a.name.localeCompare(b.name));
  }
}
