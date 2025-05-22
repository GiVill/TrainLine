import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { parseAllGTFSData } from "@/lib/gtfsParser";
import { GTFSData, SelectedStation, Stop } from "@/types/gtfs";
import { getConnectedStations, getPlatformCount, getStationById, getStationStatus } from "@/lib/utils";

// Hook to fetch and provide GTFS data
export const useGTFSData = () => {
  const { data, isLoading, error } = useQuery<GTFSData>({
    queryKey: ['/api/gtfs'],
    queryFn: parseAllGTFSData,
    staleTime: Infinity, // GTFS data doesn't change often
  });
  
  // Function to get the selected station with additional information
  // Using useCallback to prevent recreation on every render
  const getSelectedStationDetails = useCallback((stationId: string): SelectedStation | null => {
    if (!data || !stationId) return null;
    
    const station = getStationById(data.stops, stationId);
    if (!station) return null;
    
    // Get connected station IDs
    const connectedStationIds = getConnectedStations(stationId, data.stopTimes);
    
    // Get the connected station objects
    const connectedStations = connectedStationIds
      .map(id => getStationById(data.stops, id))
      .filter(station => station !== undefined) as Stop[];
    
    const platformInfo = getPlatformCount(stationId);
    
    return {
      ...station,
      status: getStationStatus(stationId),
      platformInfo,
      connectedStations
    };
  }, [data]); // Only recreate when data changes
  
  return {
    gtfsData: data,
    isLoading,
    error,
    getSelectedStationDetails
  };
};
