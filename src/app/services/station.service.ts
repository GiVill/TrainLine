// src/app/services/station.service.ts
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import stopsData from '../model/Data/stops.txt';
import shapesData from '../model/Data/shapes.txt';
import { Shape, Station } from '../model/models ';


@Injectable({
  providedIn: 'root'
})
export class StationService {
  private readonly stations: Station[] = this.parseStations();
  private readonly shapes: Shape[]  = this.parseShapes();

  getStations(): Observable<Station[]> {
    return of(this.stations);
  }

  getStationById(stopId: string): Observable<Station|undefined> {
    return of(this.stations.find(s => s.stop_id === stopId));
  }

  getShapes(): Observable<Shape[]> {
    return of(this.shapes);
  }

  // ————————————————————————————————————————————————
  // parsing dei file CSV

  private parseStations(): Station[] {
    const lines = stopsData
      .split(/\r?\n/)
      .filter(l => l.trim().length > 0);

    const [header, ...rows] = lines;
    const cols = header.split(',').map(c => c.replace(/"/g, ''));

    return rows.map(row => {
      const vals = this.parseCSVLine(row);
      const obj: any = {};
      cols.forEach((col, i) => obj[col] = vals[i] || '');

      return {
        stop_id:            obj.stop_id.replace(/"/g,''),
        stop_code:          obj.stop_code.replace(/"/g,''),
        stop_name:          obj.stop_name.replace(/"/g,''),
        stop_desc:          obj.stop_desc.replace(/"/g,''),
        stop_lat:           parseFloat(obj.stop_lat),
        stop_lon:           parseFloat(obj.stop_lon),
        zone_id:            obj.zone_id,
        stop_url:           obj.stop_url,
        location_type:      obj.location_type,
        parent_station:     obj.parent_station,
        stop_timezone:      obj.stop_timezone,
        wheelchair_boarding: obj.wheelchair_boarding,
        level_id:           obj.level_id,
        platform_code:      obj.platform_code
      } as Station;
    });
  }

  private parseShapes(): Shape[] {
    const lines = shapesData
      .split(/\r?\n/)
      .filter(l => l.trim().length > 0);

    const [header, ...rows] = lines;
    const cols = header.split(',').map(c => c.replace(/"/g, ''));

    return rows.map(row => {
      const vals = this.parseCSVLine(row);
      const obj: any = {};
      cols.forEach((col, i) => obj[col] = vals[i] || '');

      return {
        shape_id:           obj.shape_id.replace(/"/g,''),
        shape_pt_lat:       parseFloat(obj.shape_pt_lat),
        shape_pt_lon:       parseFloat(obj.shape_pt_lon),
        shape_pt_sequence:  parseInt(obj.shape_pt_sequence, 10),
        shape_dist_traveled: obj.shape_dist_traveled
      } as Shape;
    });
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const ch of line) {
      if (ch === '"' ) {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }
}
