import { useEffect, useState } from "react";
import { Stop } from "@/types/gtfs";
import { cn } from "@/lib/utils";
import StationsList from "./StationsList";

export interface SidebarProps {
  stations: Stop[];
  selectedStationId: string | null;
  onSelectStation: (stationId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ 
  stations, 
  selectedStationId, 
  onSelectStation, 
  isOpen, 
  onToggle 
}: SidebarProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stationView, setStationView] = useState<'list' | 'detail'>('list');
  
  useEffect(() => {
    if (!selectedStationId) {
      setStationView('list');
    }
  }, [selectedStationId]);

  useEffect(() => {
    if (selectedStationId) {
      setStationView('detail');
    }
  }, [selectedStationId]);

  const majorStationIds = [
    '830012891', // CAGLIARI
    '830012807', // SASSARI
    '830012878', // ORISTANO
    '830012869', // MACOMER
    '830012855'  // OLBIA
  ];

  const majorStations = stations.filter(station =>
    majorStationIds.includes(station.stop_id)
  );

  const filteredMajorStations = majorStations.filter(station => 
    station.stop_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStation = selectedStationId 
    ? stations.find(station => station.stop_id === selectedStationId)
    : null;

  const handleBackToList = () => {
    setStationView('list');
  };

  const renderStationListView = () => (
    <>
      <div className="sticky top-0 bg-white z-10 border-b border-neutral-200">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Network Overview</h2>
            <button onClick={onToggle} className="md:hidden p-1 rounded hover:bg-neutral-100">
              <span className="material-icons">menu</span>
            </button>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="material-icons text-neutral-500">search</span>
            </span>
            <input 
              type="text" 
              placeholder="Search stations, routes, trips..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-secondary focus:border-secondary"
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-medium text-neutral-500 mb-2">MAJOR STATIONS</h3>
        <StationsList 
          stations={filteredMajorStations} 
          selectedStationId={selectedStationId}
          onSelectStation={onSelectStation}
          listType="major"
        />
      </div>
    </>
  );

  const renderStationDetailView = () => (
    <>
      <div className="sticky top-0 bg-white z-10 border-b border-neutral-200">
        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <button 
              onClick={handleBackToList} 
              className="p-2 -ml-2 flex items-center text-secondary font-medium rounded-full hover:bg-neutral-100"
            >
              <span className="material-icons mr-1">arrow_back</span>
              Back to Stations
            </button>
            <button onClick={onToggle} className="md:hidden p-1 rounded hover:bg-neutral-100">
              <span className="material-icons">menu</span>
            </button>
          </div>
          {selectedStation && (
            <h2 className="text-lg font-bold mb-4">{selectedStation.stop_name.replace('Stazione di ', '')}</h2>
          )}
        </div>
      </div>
    </>
  );

  return (
    <aside className={cn(
      "w-full md:w-80 lg:w-96 bg-white shadow-md z-10 overflow-y-auto flex-shrink-0 border-r border-neutral-200 fixed md:static inset-0",
      isOpen ? "block" : "hidden md:block"
    )}>
      {stationView === 'list' ? renderStationListView() : renderStationDetailView()}
    </aside>
  );
};

export default Sidebar;
