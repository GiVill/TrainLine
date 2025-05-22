import { GeoJsonLine, GeoJsonPoint, Shape, Stop, StopTime, Trip } from "@/types/gtfs";
import { getStationStatus } from "./utils";

// Constants for Sardinia's bounding box
export const SARDINIA_BOUNDS = {
  north: 41.31,
  south: 38.85,
  east: 9.83,
  west: 8.13
};

// Convert stops to GeoJSON for Mapbox
export const stopsToGeoJson = (stops: Stop[]): GeoJsonPoint[] => {
  return stops.map(stop => {
    // Determine if this is a major station (Cagliari, Sassari, etc.)
    const majorStationIds = [
      '830012891', // CAGLIARI
      '830012807', // SASSARI
      '830012878', // ORISTANO
      '830012869', // MACOMER
      '830012855'  // OLBIA
    ];
    
    const isMajor = majorStationIds.includes(stop.stop_id);
    
    return {
      type: 'Feature',
      properties: {
        id: stop.stop_id,
        name: stop.stop_name.replace('Stazione di ', ''),
        zone_id: stop.zone_id,
        status: getStationStatus(stop.stop_id),
        size: isMajor ? 'major' : 'minor'
      },
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(stop.stop_lon), parseFloat(stop.stop_lat)]
      }
    };
  });
};

// Create shape lines from shapes.txt data
export const createShapeLines = (shapes: Shape[]): GeoJsonLine[] => {
  const lines: GeoJsonLine[] = [];
  const shapeGroups = new Map<string, Shape[]>();

  // Group shapes by shape_id
  shapes.forEach(shape => {
    if (!shapeGroups.has(shape.shape_id)) {
      shapeGroups.set(shape.shape_id, []);
    }
    shapeGroups.get(shape.shape_id)!.push(shape);
  });

  // For each shape_id, create a GeoJSON LineString
  shapeGroups.forEach((shapePoints, shapeId) => {
    // Sort shape points by sequence
    const sortedPoints = [...shapePoints].sort(
      (a, b) => parseInt(a.shape_pt_sequence) - parseInt(b.shape_pt_sequence)
    );

    // Create coordinates for the line
    const coordinates: [number, number][] = sortedPoints.map(point => [
      parseFloat(point.shape_pt_lon),
      parseFloat(point.shape_pt_lat)
    ]);

    if (coordinates.length >= 2) {
      // Determine if this is a railway or bus route based on shape_id
      const isRailway = shapeId.startsWith('1'); // Assumption: railway shape_ids start with '1'

      lines.push({
        type: 'Feature',
        properties: {
          id: shapeId,
          name: `Shape ${shapeId}`,
          type: isRailway ? 'REG' : 'BUS'
        },
        geometry: {
          type: 'LineString',
          coordinates
        }
      });
    }
  });

  return lines;
};

// Crea linee di percorso dai dati dei file trips.txt e stop_times.txt
export const createRouteLines = (stops: Stop[], stopTimes: StopTime[], trips: Trip[]): GeoJsonLine[] => {
  console.log("Creating route lines from trips data...");
  console.log(`Found ${trips.length} trips, ${stopTimes.length} stop times, and ${stops.length} stops`);
  
  // Crea una mappa di stop_id per un accesso rapido agli oggetti Stop
  const stopsMap = new Map<string, Stop>();
  stops.forEach(stop => stopsMap.set(stop.stop_id, stop));
  
  // Raggruppa i tempi di fermata per trip
  const tripStops = new Map<string, StopTime[]>();
  stopTimes.forEach(stopTime => {
    if (!tripStops.has(stopTime.trip_id)) {
      tripStops.set(stopTime.trip_id, []);
    }
    tripStops.get(stopTime.trip_id)!.push(stopTime);
  });
  
  // Ordina i tempi di fermata per sequenza e crea linee
  const lines: GeoJsonLine[] = [];
  const processedRoutes = new Set<string>();
  
  trips.forEach(trip => {
    // Utilizza solo trip con route_id e trip_id validi
    if (!trip.route_id || !trip.trip_id) return;
    
    const tripStopTimes = tripStops.get(trip.trip_id);
    if (!tripStopTimes || tripStopTimes.length <= 1) return;
    
    // Ordina per sequenza di fermata
    const sortedStopTimes = [...tripStopTimes].sort(
      (a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence)
    );
    
    // Crea una chiave unica per questo percorso per evitare duplicati
    const firstStopId = sortedStopTimes[0].stop_id;
    const lastStopId = sortedStopTimes[sortedStopTimes.length - 1].stop_id;
    const routeKey = `${trip.route_id}-${firstStopId}-${lastStopId}`;
    
    if (processedRoutes.has(routeKey)) return;
    processedRoutes.add(routeKey);
    
    // Crea coordinate per la linea
    const coordinates: [number, number][] = [];
    
    sortedStopTimes.forEach(stopTime => {
      const stop = stopsMap.get(stopTime.stop_id);
      if (stop) {
        coordinates.push([parseFloat(stop.stop_lon), parseFloat(stop.stop_lat)]);
      }
    });
    
    if (coordinates.length >= 2) {
      // Determina il tipo di linea basandosi sul route_id
      // Dai dati GTFS forniti, route_id che iniziano con '1' sono treni regionali
      const isRegionalTrain = trip.route_id.startsWith('1');
      
      lines.push({
        type: 'Feature',
        properties: {
          id: routeKey,
          name: trip.trip_headsign || `Trip ${trip.trip_id}`,
          type: isRegionalTrain ? 'REG' : 'BUS'
        },
        geometry: {
          type: 'LineString',
          coordinates
        }
      });
    }
  });
  
  console.log(`Generated ${lines.length} route lines`);
  return lines;
};

// Get departures for a station
export const getStationDepartures = (stationId: string, stopTimes: StopTime[], trips: Trip[]) => {
  // Filter stop times for this station
  const stationDepartures = stopTimes
    .filter(st => st.stop_id === stationId)
    .sort((a, b) => {
      // Sort by departure time
      return a.departure_time.localeCompare(b.departure_time);
    })
    .slice(0, 5); // Get only the first few departures
  
  // Get trip information for each departure
  return stationDepartures.map(st => {
    const trip = trips.find(t => t.trip_id === st.trip_id);
    
    return {
      trip_id: st.trip_id,
      destination: trip?.trip_headsign || 'Unknown',
      departure_time: st.departure_time,
      platform: Math.floor(Math.random() * 5 + 1).toString(), // This would be real data in production
      status: Math.random() > 0.8 ? 'Delayed 5m' : 'On Time' // This would be real data in production
    };
  });
};
