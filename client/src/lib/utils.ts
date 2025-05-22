import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatTime = (time: string): string => {
  if (!time) return '';
  return time.substring(0, 5); // Extract HH:MM from HH:MM:SS
};

export const getStationStatus = (stationId: string): 'active' | 'maintenance' | 'inactive' => {
  // This would be replaced with actual status logic based on data
  // For now, some hard-coded statuses for important stations
  const maintenanceStations = ['830012869'];
  const inactiveStations = [];
  
  if (maintenanceStations.includes(stationId)) {
    return 'maintenance';
  } else if (inactiveStations.includes(stationId)) {
    return 'inactive';
  }
  return 'active';
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'bg-success';
    case 'maintenance': return 'bg-warning';
    case 'inactive': return 'bg-destructive';
    case 'On Time': return 'bg-success';
    case 'Delayed': return 'bg-warning';
    case 'Cancelled': return 'bg-destructive';
    default: return 'bg-neutral-500';
  }
};

export const getStationById = (stations: any[], id: string) => {
  return stations.find(station => station.stop_id === id);
};

export const getConnectedStations = (stationId: string, stopTimes: any[]): string[] => {
  // Find all trips that include this station
  const relevantTrips = stopTimes
    .filter(st => st.stop_id === stationId)
    .map(st => st.trip_id);
  
  // Find all stops on those trips
  const connectedStopIds = new Set<string>();
  
  stopTimes
    .filter(st => relevantTrips.includes(st.trip_id) && st.stop_id !== stationId)
    .forEach(st => connectedStopIds.add(st.stop_id));
    
  return Array.from(connectedStopIds);
};

export const getPlatformCount = (stationId: string): { total: number, active: number } => {
  // This would be replaced with actual platform count logic based on data
  // For now, return some default values based on the station
  const stationPlatforms: Record<string, { total: number, active: number }> = {
    '830012891': { total: 12, active: 10 }, // CAGLIARI
    '830012807': { total: 8, active: 8 }, // SASSARI
    '830012878': { total: 5, active: 5 }, // ORISTANO
    '830012869': { total: 3, active: 2 }, // MACOMER
    '830012855': { total: 6, active: 6 }, // OLBIA
  };
  
  return stationPlatforms[stationId] || { total: 2, active: 2 };
};

export const tripStatus = () => {
  // This would be replaced with actual status logic based on data
  const statuses = ['On Time', 'Delayed 5m', 'On Time', 'On Time'];
  return statuses[Math.floor(Math.random() * statuses.length)];
};
