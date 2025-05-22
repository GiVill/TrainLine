import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { Shape, Station } from '../model/station ';

@Injectable({
  providedIn: 'root'
})
export class StationService {
  private stopsData = `"stop_id","stop_code","stop_name","stop_desc","stop_lat","stop_lon","zone_id","stop_url","location_type","parent_station","stop_timezone","wheelchair_boarding","level_id","platform_code"
"830012810",,"Stazione di CAGLIARI S.GILLA",,"39.22779","9.096391","6",,,,,,,
"830012816",,"Stazione di PLOAGHE",,"40.661322","8.72808","412",,,,,,,
"830012852",,"Stazione di GOLFO ARANCI",,"40.994716","9.627688","328",,,,,,,
"830012891",,"Stazione di CAGLIARI",,"39.216084","9.107992","6",,,,,,,
"830012895",,"Stazione di RUDALZA (GOLFO ARANCI)",,"40.994089","9.531225","345",,,,,,,
"830012896",,"Stazione di SU CANALE (MONTI)",,"40.838383","9.404229","333",,,,,,,
"830012950",,"Stazione di IGLESIAS",,"39.310571","8.539796","106",,,,,,,
"830012818",,"Stazione di PORTO TORRES MARITTIMA",,"40.837917","8.397302","413",,,,,,,
"830012807",,"Stazione di SASSARI",,"40.729515","8.554162","420",,,,,,,
"830012902",,"Stazione di Olbia Terranova",,"40.92238","9.49458","335",,,,,,,
"830012954",,"Stazione di SILIQUA",,"39.297006","8.813079","69",,,,,,,
"830012956",,"Stazione di VILLASPECIOSA UTA",,"39.30417","8.940507","90",,,,,,,
"830013703",,"Stazione di Carbonia Serbariu",,"39.163526","8.513212","97",,,,,,,
"830012859",,"Stazione di BERCHIDDA",,"40.772052","9.181317","320",,,,,,,
"830012866",,"Stazione di GIAVE",,"40.455878","8.72939","386",,,,,,,
"830012867",,"Stazione di BONORVA",,"40.417767","8.760714","368",,,,,,,
"830012857",,"Stazione di MONTI TELTI",,"40.829635","9.322818","333",,,,,,,
"830012860",,"Stazione di OSCHIRI",,"40.713274","9.107759","336",,,,,,,
"830012872",,"Stazione di BORORE",,"40.218998","8.809539","139",,,,,,,
"830012869",,"Stazione di MACOMER",,"40.267906","8.772281","156",,,,,,,
"830012885",,"Stazione di SAMASSI SERRENTI",,"39.48308","8.899043","456",,,,,,,
"830012888",,"Stazione di DECIMOMANNU",,"39.304598","8.965811","13",,,,,,,
"830012886",,"Stazione di SERRAMANNA NURAMINIS",,"39.426129","8.916582","460",,,,,,,
"830012952",,"Stazione di VILLAMASSARGIA DOMUSNOVAS",,"39.294813","8.641988","129",,,,,,,
"830012887",,"Stazione di VILLASOR",,"39.381454","8.935909","89",,,,,,,
"830012819",,"Stazione di Elmas Aeroporto",,"39.257262","9.062786","18",,,,,,,
"830012890",,"Stazione di CAGLIARI ELMAS",,"39.264201","9.045504","18",,,,,,,
"830012873",,"Stazione di ABBASANTA",,"40.12881","8.817741","214",,,,,,,
"830012874",,"Stazione di PAULILATINO",,"40.077377","8.775812","266",,,,,,,
"830012879",,"Stazione di MARRUBIU-TERRALBA-ARBOREA",,"39.75293","8.641149","246",,,,,,,
"830012878",,"Stazione di ORISTANO",,"39.902038","8.603982","263",,,,,,,
"830012876",,"Stazione di SOLARUSSA",,"39.952526","8.679818","293",,,,,,,
"830012880",,"Stazione di URAS MOGORO",,"39.692633","8.696463","303",,,,,,,
"830012862",,"Stazione di OZIERI CHILIVANI",,"40.609504","8.933753","379",,,,,,,
"830012808",,"Stazione di Assemini S. Lucia",,"39.291031","8.989286","2",,,,,,,
"830012809",,"Stazione di Assemini Carmine",,"39.281795","9.013726","2",,,,,,,
"830012889",,"Stazione di ASSEMINI",,"39.287611","8.997937","2",,,,,,,
"830012855",,"Stazione di OLBIA",,"40.924599","9.498301","335",,,,,,,
"830012802",,"Stazione di PORTO TORRES",,"40.833049","8.39642","413",,,,,,,
"830012882",,"Stazione di S.GAVINO (SAN GAVINO MONREALE)",,"39.546212","8.788027","454",,,,,,,
"830012854",,"Stazione di MARINELLA (GOLFO ARANCI)",,"40.999137","9.55362","345",,,,,,,`;

  private shapesData = `"shape_id","shape_pt_lat","shape_pt_lon","shape_pt_sequence","shape_dist_traveled"
"1-4791-00F-0083","40.92238","9.49458","1",
"1-4791-00F-0083","40.857061","9.431094","2",
"1-4791-00F-0083","40.838383","9.404229","3",
"1-4791-00F-0083","40.829635","9.322818","4",
"1-4791-00F-0083","40.772052","9.181317","5",
"1-4791-00F-0083","40.713274","9.107759","6",
"1-4791-00F-0083","40.672022","9.046025","7",
"1-4791-00F-0083","40.627337","8.986503","8",
"1-4791-00F-0083","40.609504","8.933753","9",
"1-4791-00F-0083","40.601417","8.91562","10",
"1-4791-00F-0083","40.555956","8.875847","11",
"1-4791-00F-0083","40.482775","8.781622","12",
"1-4791-00F-0083","40.455878","8.72939","13",
"1-4791-00F-0083","40.417767","8.760714","14",
"1-4791-00F-0083","40.328581","8.783627","15",
"1-4791-00F-0083","40.267906","8.772281","16",
"1-22055-01B-0083","39.546212","8.788027","1",
"1-22055-01B-0083","39.526147","8.850224","2",
"1-22055-01B-0083","39.48308","8.899043","3",
"1-22055-01B-0083","39.426129","8.916582","4",
"1-22055-01B-0083","39.381454","8.935909","5",
"1-22055-01B-0083","39.304598","8.965811","6",
"1-22055-01B-0083","39.291031","8.989286","7",
"1-22055-01B-0083","39.287611","8.997937","8",
"1-22055-01B-0083","39.281795","9.013726","9",
"1-22055-01B-0083","39.264201","9.045504","10",
"1-22055-01B-0083","39.257262","9.062786","11",
"1-22055-01B-0083","39.22779","9.096391","12",
"1-22055-01B-0083","39.216084","9.107992","13",
"1-21246-021-0083","39.216084","9.107992","1",
"1-21246-021-0083","39.22779","9.096391","2",
"1-21246-021-0083","39.257262","9.062786","3",
"1-21246-021-0083","39.264201","9.045504","4",
"1-21246-021-0083","39.281795","9.013726","5",
"1-21246-021-0083","39.287611","8.997937","6",
"1-21246-021-0083","39.291031","8.989286","7",
"1-21246-021-0083","39.304598","8.965811","8",
"1-21246-021-0083","39.381454","8.935909","9",
"1-21246-021-0083","39.426129","8.916582","10",
"1-21246-021-0083","39.48308","8.899043","11",
"1-21246-021-0083","39.526147","8.850224","12",
"1-21246-021-0083","39.546212","8.788027","13",
"1-21246-021-0083","39.610881","8.741016","14",
"1-21246-021-0083","39.692633","8.696463","15",
"1-21246-021-0083","39.75293","8.641149","16",
"1-21246-021-0083","39.810761","8.641456","17",
"1-21246-021-0083","39.902038","8.603982","18"`;

  private parseStations(): Station[] {
    const lines = this.stopsData.split('\n');
    const stations: Station[] = [];

    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
      if (values.length >= 6) {
        stations.push({
          stop_id: values[0],
          stop_code: values[1],
          stop_name: values[2],
          stop_desc: values[3],
          stop_lat: parseFloat(values[4]),
          stop_lon: parseFloat(values[5]),
          zone_id: values[6] || '',
          stop_url: values[7] || '',
          location_type: values[8] || '',
          parent_station: values[9] || '',
          stop_timezone: values[10] || '',
          wheelchair_boarding: values[11] || '',
          level_id: values[12] || '',
          platform_code: values[13] || ''
        });
      }
    }

    return stations;
  }

  private parseShapes(): Shape[] {
    const lines = this.shapesData.split('\n');
    const shapes: Shape[] = [];

    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
      if (values.length >= 4) {
        shapes.push({
          shape_id: values[0],
          shape_pt_lat: parseFloat(values[1]),
          shape_pt_lon: parseFloat(values[2]),
          shape_pt_sequence: parseInt(values[3]),
          shape_dist_traveled: values[4] || ''
        });
      }
    }

    return shapes;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  getStations(): Observable<Station[]> {
    return of(this.parseStations());
  }

  getShapes(): Observable<Shape[]> {
    return of(this.parseShapes());
  }

  getStationById(stopId: string): Observable<Station | undefined> {
    const stations = this.parseStations();
    const station = stations.find(s => s.stop_id === stopId);
    return of(station);
  }
}
