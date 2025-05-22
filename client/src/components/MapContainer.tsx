import { useEffect } from "react";
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { GTFSData } from "@/types/gtfs";
import { createRouteLines, stopsToGeoJson, SARDINIA_BOUNDS } from "@/lib/mapUtils";

interface MapContainerProps {
  gtfsData: GTFSData | undefined;
  selectedStationId: string | null;
  onSelectStation: (stationId: string) => void;
  sidebarWidth: number;
  isDetailOpen: boolean;
}

// Fissa l'icona dei Marker di Leaflet (evita problemi in build)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
});

const FlyToStation = ({ lat, lon }: { lat: number; lon: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], 11, { duration: 1 });
  }, [lat, lon, map]);
  return null;
};

const MapContainer = ({
  gtfsData,
  selectedStationId,
  onSelectStation,
  sidebarWidth,
  isDetailOpen
}: MapContainerProps) => {
  const stationsGeoJson = gtfsData ? stopsToGeoJson(gtfsData.stops) : [];
  const routeLines = gtfsData
    ? createRouteLines(gtfsData.stops, gtfsData.stopTimes, gtfsData.trips)
    : [];

  const selectedStation = gtfsData?.stops.find(s => s.stop_id === selectedStationId);

  return (
    <div className="flex-1 relative">
      <LeafletMap
        center={[39.216084, 9.107992]} // Cagliari
        zoom={7}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%" }}
        bounds={[
          [SARDINIA_BOUNDS.south, SARDINIA_BOUNDS.west],
          [SARDINIA_BOUNDS.north, SARDINIA_BOUNDS.east]
        ]}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Railway Overlay */}
        <TileLayer
          attribution='&copy; OpenRailwayMap contributors'
          url="https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png"
        />

        {/* Route Lines */}
        {routeLines.map((feature, idx) => (
          <Polyline
            key={idx}
            positions={feature.geometry.coordinates.map(([lon, lat]) => [lat, lon])}
            pathOptions={{
              color: feature.properties.type === "REG" ? "#DA1D2A" : "#005FB5",
              weight: 2,
              dashArray: "4,4",
              opacity: 0.8,
            }}
          />
        ))}

        {/* Stations */}
        {stationsGeoJson.map((feature: any) => (
          <Marker
            key={feature.properties.id}
            position={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
            eventHandlers={{
              click: () => onSelectStation(feature.properties.id),
            }}
          >
            <Popup>
              <strong>{feature.properties.name}</strong><br />
              {feature.properties.size} station
            </Popup>
          </Marker>
        ))}

        {/* Fly to selected station */}
        {selectedStation && (
          <FlyToStation
            lat={parseFloat(selectedStation.stop_lat)}
            lon={parseFloat(selectedStation.stop_lon)}
          />
        )}
      </LeafletMap>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg shadow-lg p-3 text-sm z-10">
        <h3 className="font-bold text-neutral-800 mb-2">Map Legend</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-primary mr-2"></div>
            <span>Major Station</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-secondary mr-2"></div>
            <span>Secondary Station</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-neutral-700 mr-2"></div>
            <span>Minor Station</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-1 bg-primary mr-2"></div>
            <span>Railway Line (REG)</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-1 bg-secondary mr-2"></div>
            <span>Bus Route (BUS)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapContainer;