import { Stop } from "@/types/gtfs";
import { cn, getPlatformCount, getStationStatus, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface StationsListProps {
  stations: Stop[];
  selectedStationId: string | null;
  onSelectStation: (stationId: string) => void;
  listType: 'major' | 'minor';
}

const StationsList = ({ 
  stations, 
  selectedStationId, 
  onSelectStation,
  listType
}: StationsListProps) => {
  if (listType === 'major') {
    return (
      <>
        {stations.map((station) => {
          const status = getStationStatus(station.stop_id);
          const statusColor = getStatusColor(status);
          const platforms = getPlatformCount(station.stop_id);
          
          return (
            <div 
              key={station.stop_id}
              className={cn(
                "bg-neutral-50 rounded-lg p-3 mb-3 border-l-4 cursor-pointer hover:bg-neutral-100 transition-colors",
                selectedStationId === station.stop_id 
                  ? "border-primary" 
                  : status === 'active' 
                    ? "border-secondary" 
                    : "border-neutral-300"
              )}
              onClick={() => onSelectStation(station.stop_id)}
            >
              <div className="flex justify-between">
                <div>
                  <h4 className="font-bold">{station.stop_name.replace('Stazione di ', '')}</h4>
                  <p className="text-sm text-neutral-600">Zone ID: {station.zone_id}</p>
                </div>
                <div className="flex flex-col items-end">
                  <Badge variant={status === 'active' ? "success" : status === 'maintenance' ? "warning" : "destructive"}>
                    {status === 'active' ? 'Active' : status === 'maintenance' ? 'Maintenance' : 'Inactive'}
                  </Badge>
                  <span className="text-xs text-neutral-500 mt-1">{platforms.active} platforms</span>
                </div>
              </div>
            </div>
          );
        })}
      </>
    );
  }
  
  return (
    <div className="bg-white rounded border border-neutral-200 divide-y divide-neutral-200 mb-4">
      {stations.map((station) => (
        <div 
          key={station.stop_id}
          className={cn(
            "p-2 flex justify-between hover:bg-neutral-50 cursor-pointer",
            selectedStationId === station.stop_id ? "bg-neutral-100" : ""
          )}
          onClick={() => onSelectStation(station.stop_id)}
        >
          <div className="flex items-center">
            <span className="material-icons text-neutral-400 mr-2">train</span>
            <span>{station.stop_name.replace('Stazione di ', '')}</span>
          </div>
          <span className="text-xs font-medium text-neutral-500">Zone: {station.zone_id}</span>
        </div>
      ))}
    </div>
  );
};

export default StationsList;
