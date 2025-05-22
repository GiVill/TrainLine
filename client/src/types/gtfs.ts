// GTFS Data Types

export interface Agency {
  agency_id: string;
  agency_name: string;
  agency_url: string;
  agency_timezone: string;
  agency_lang: string;
  agency_phone?: string;
  agency_fare_url?: string;
  agency_email?: string;
}

export interface Route {
  route_id: string;
  agency_id: string;
  route_short_name: string;
  route_long_name: string;
  route_desc?: string;
  route_type: string;
  route_url?: string;
  route_color?: string;
  route_text_color?: string;
  route_sort_order?: string;
  continuous_pickup?: string;
  continuous_drop_off?: string;
}

export interface Stop {
  stop_id: string;
  stop_code?: string;
  stop_name: string;
  stop_desc?: string;
  stop_lat: string;
  stop_lon: string;
  zone_id?: string;
  stop_url?: string;
  location_type?: string;
  parent_station?: string;
  stop_timezone?: string;
  wheelchair_boarding?: string;
  level_id?: string;
  platform_code?: string;
}

export interface Trip {
  route_id: string;
  service_id: string;
  trip_id: string;
  trip_headsign?: string;
  trip_short_name?: string;
  direction_id?: string;
  block_id?: string;
  shape_id?: string;
  wheelchair_accessible?: string;
  bikes_allowed?: string;
}

export interface StopTime {
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_id: string;
  stop_sequence: string;
  stop_headsign?: string;
  pickup_type?: string;
  drop_off_type?: string;
  continuous_pickup?: string;
  continuous_drop_off?: string;
  shape_dist_traveled?: string;
  timepoint?: string;
}

export interface Calendar {
  service_id: string;
  date: string;
  exception_type: string;
}

export interface GTFSData {
  agencies: Agency[];
  routes: Route[];
  stops: Stop[];
  trips: Trip[];
  stopTimes: StopTime[];
  calendars: Calendar[];
}

export interface GeoJsonPoint {
  type: 'Feature';
  properties: {
    id: string;
    name: string;
    zone_id?: string;
    status: 'active' | 'maintenance' | 'inactive';
    size: 'major' | 'minor';
    cluster?: boolean;
    point_count?: number;
    point_count_abbreviated?: number;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface GeoJsonLine {
  type: 'Feature';
  properties: {
    id: string;
    name?: string;
    type: 'REG' | 'BUS'; 
  };
  geometry: {
    type: 'LineString';
    coordinates: Array<[number, number]>;
  };
}

export type SelectedStation = Stop & {
  status: 'active' | 'maintenance' | 'inactive';
  platformInfo: { total: number; active: number };
  connectedStations: Stop[];
}

export interface TrafficData {
  day: string;
  trips: number;
  onTime: number;
  delayed: number;
}

export interface StationDeparture {
  trip_id: string;
  destination: string;
  departure_time: string;
  platform: string;
  status: string;
}
