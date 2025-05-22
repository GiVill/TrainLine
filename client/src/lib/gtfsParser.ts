import { Agency, Calendar, GTFSData, Route, Stop, StopTime, Trip } from "@/types/gtfs";

// Helper function to parse CSV text
const parseCSV = (csvText: string): any[] => {
  if (!csvText || csvText.trim() === '') return [];
  
  const rows = csvText.trim().split('\n');
  if (rows.length <= 1) return [];
  
  const headers = rows[0].split(',').map(header => header.replace(/"/g, ''));
  
  return rows.slice(1).map(row => {
    const values = row.split(',').map(val => val.replace(/"/g, ''));
    const obj: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      if (index < values.length) {
        obj[header] = values[index];
      }
    });
    
    return obj;
  }).filter(obj => Object.keys(obj).length > 0); // Filter out empty rows
};

export const parseAgencyCsv = (csvText: string): Agency[] => {
  return parseCSV(csvText) as Agency[];
};

export const parseRoutesCsv = (csvText: string): Route[] => {
  return parseCSV(csvText) as Route[];
};

export const parseStopsCsv = (csvText: string): Stop[] => {
  return parseCSV(csvText) as Stop[];
};

export const parseTripsCsv = (csvText: string): Trip[] => {
  return parseCSV(csvText) as Trip[];
};

export const parseStopTimesCsv = (csvText: string): StopTime[] => {
  return parseCSV(csvText) as StopTime[];
};

export const parseCalendarCsv = (csvText: string): Calendar[] => {
  return parseCSV(csvText) as Calendar[];
};

export const parseAllGTFSData = async (): Promise<GTFSData> => {
  try {
    const [agencyResponse, routesResponse, stopsResponse, tripsResponse, stopTimesResponse, calendarResponse] = 
      await Promise.all([
        fetch('/api/gtfs/agency'),
        fetch('/api/gtfs/routes'),
        fetch('/api/gtfs/stops'),
        fetch('/api/gtfs/trips'),
        fetch('/api/gtfs/stop_times'),
        fetch('/api/gtfs/calendar_dates')
      ]);

    const [agencyData, routesData, stopsData, tripsData, stopTimesData, calendarData] = 
      await Promise.all([
        agencyResponse.text(),
        routesResponse.text(),
        stopsResponse.text(),
        tripsResponse.text(),
        stopTimesResponse.text(),
        calendarResponse.text()
      ]);

    return {
      agencies: parseAgencyCsv(agencyData),
      routes: parseRoutesCsv(routesData),
      stops: parseStopsCsv(stopsData),
      trips: parseTripsCsv(tripsData),
      stopTimes: parseStopTimesCsv(stopTimesData),
      calendars: parseCalendarCsv(calendarData)
    };
  } catch (error) {
    console.error('Error parsing GTFS data:', error);
    throw error;
  }
};
