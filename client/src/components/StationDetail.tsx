import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SelectedStation, StationDeparture } from "@/types/gtfs";
import { formatTime, getStatusColor } from "@/lib/utils";
import cagliariStationLayout from "@/assets/cagliari_station_layout.jpg";

interface StationDetailProps {
  selectedStation: SelectedStation;
  departures: StationDeparture[];
  onClose: () => void;
}

const StationDetail = ({ selectedStation, departures, onClose }: StationDetailProps) => {
  const isCagliariStation = selectedStation.stop_id === '830012891';

  return (
    <div className="bg-white border-t border-neutral-200 h-96 overflow-y-auto" id="station-detail-panel">
      <div className="px-6 py-4 border-b border-neutral-200 sticky top-0 bg-white z-10">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center">
              <h2 className="text-2xl font-bold">{selectedStation.stop_name.replace('Stazione di ', '')}</h2>
              <Badge 
                variant={selectedStation.status === 'active' ? 'success' : selectedStation.status === 'maintenance' ? 'warning' : 'destructive'}
                className="ml-2"
              >
                {selectedStation.status.toUpperCase()}
              </Badge>
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              className="p-2 rounded-full hover:bg-neutral-100" 
              title="Close"
              onClick={onClose}
            >
              <span className="material-icons text-neutral-400">close</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Content area */}
      <div className="p-6">
        {isCagliariStation && (
          <div className="mt-2">
            <img 
              src={cagliariStationLayout} 
              alt="Schema dei binari della stazione di Cagliari" 
              className="w-full max-w-full object-contain border border-neutral-200 rounded-md shadow-sm"
            />
            <p className="text-sm text-neutral-500 mt-2 text-center">Schema dei binari della stazione di Cagliari</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StationDetail;
