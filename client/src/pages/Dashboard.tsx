import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import Sidebar from "@/components/Sidebar";
import { getStationDepartures } from "@/lib/mapUtils";
import { useGTFSData } from "@/hooks/useGTFSData";
import MapContainer from "@/components/MapContainer";
import { StationDeparture } from "@/types/gtfs";
import StationDetail from "@/components/StationDetail";
import trenitaliaLogo from "@/assets/trenitalia_logo.png";
import sardegnaLogo from "@/assets/sardegna_logo.png";


const Dashboard = () => {
  const { gtfsData, isLoading, getSelectedStationDetails } = useGTFSData();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<any>(null);
  const [departures, setDepartures] = useState<StationDeparture[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300); // Initial estimate
  const sidebarRef = useRef<HTMLDivElement>(null);
  //jhdasvbjhdvjhasvdvjahsvd
  
  // Set up resize observer to track sidebar width
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.target === sidebarRef.current) {
          setSidebarWidth(entry.contentRect.width);
        }
      }
    });
    
    if (sidebarRef.current) {
      resizeObserver.observe(sidebarRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []); // Only run on mount and unmount
  
  // Update selected station details when station ID or GTFS data changes
  useEffect(() => {
    if (!selectedStationId || !gtfsData) {
      setSelectedStation(null);
      setDepartures([]);
      setIsDetailOpen(false);
      return;
    }
    
    const stationDetails = getSelectedStationDetails(selectedStationId);
    if (!stationDetails) {
      setSelectedStation(null);
      setDepartures([]);
      setIsDetailOpen(false);
      return;
    }
    
    setSelectedStation(stationDetails);
    
    const stationDepartures = getStationDepartures(
      selectedStationId,
      gtfsData.stopTimes,
      gtfsData.trips
    );
    
    setDepartures(stationDepartures);
    setIsDetailOpen(true);
  }, [selectedStationId, gtfsData, getSelectedStationDetails]);
  
  const handleSelectStation = (stationId: string) => {
    setSelectedStationId(stationId);
  };
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const closeStationDetail = () => {
    setSelectedStationId(null);
    setIsDetailOpen(false);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-xl mb-4">Caricamento dati GTFS in corso...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-primary text-white shadow-md z-10">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img src={trenitaliaLogo} alt="Logo Trenitalia" className="h-20" />
            <img src={sardegnaLogo} alt="Logo Sardegna" className="h-5" />
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div ref={sidebarRef}>
          <Sidebar 
            stations={gtfsData?.stops || []}
            selectedStationId={selectedStationId}
            onSelectStation={handleSelectStation}
            isOpen={isSidebarOpen}
            onToggle={toggleSidebar}
          />
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <MapContainer 
            gtfsData={gtfsData}
            selectedStationId={selectedStationId}
            onSelectStation={handleSelectStation}
            sidebarWidth={sidebarWidth}
            isDetailOpen={isDetailOpen}
          />
          
          {isDetailOpen && selectedStation && (
            <StationDetail 
              selectedStation={selectedStation}
              departures={departures}
              onClose={closeStationDetail}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
