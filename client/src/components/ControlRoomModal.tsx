import { useState } from "react";

interface ControlRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ControlRoomModal = ({ isOpen, onClose }: ControlRoomModalProps) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-auto">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold">Technical Control Panel</h2>
          <button 
            className="p-1 rounded-full hover:bg-neutral-100"
            onClick={onClose}
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-900 text-green-400 font-mono p-4 rounded-md h-80 overflow-auto text-sm">
              <div>$ system_status -t transport</div>
              <div>TRANSPORT SYSTEMS MONITORING</div>
              <div>============================</div>
              <div className="text-green-300">REG service: ONLINE</div>
              <div className="text-green-300">BUS service: ONLINE</div>
              <div className="text-yellow-300">WARNING: 2 trains delayed (TS-01921, TS-04382)</div>
              <div>Checking track systems...</div>
              <div className="text-green-300">Track systems: OPERATIONAL</div>
              <div>$ track_maintenance -l</div>
              <div>PLANNED MAINTENANCE:</div>
              <div>- Platform 3 (SASSARI): 2024-05-12</div>
              <div>- Track 4-B (CAGLIARI-DECIMOMANNU): 2024-05-14</div>
              <div>- Signaling (OLBIA): 2024-05-16</div>
              <div>$ _</div>
            </div>
            
            <div className="h-80 rounded-md overflow-hidden relative">
              <img 
                src="https://pixabay.com/get/geaebbefef3b348ea506d08b5e27d18a63d7b4353e696983d79ef68d56a53fb3933bba3fb9b038c2b0d9117328f71b2f166dd8537450a568dbc25412e8b405e62_1280.jpg" 
                alt="Railway control room" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                <span className="text-white font-bold text-lg">Live Camera Feeds</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-6">
            <button className="p-3 bg-primary text-white rounded-md hover:bg-primary-dark flex flex-col items-center justify-center">
              <span className="material-icons mb-1">warning</span>
              <span className="text-sm font-medium">Alert System</span>
            </button>
            <button className="p-3 bg-neutral-800 text-white rounded-md hover:bg-neutral-900 flex flex-col items-center justify-center">
              <span className="material-icons mb-1">terminal</span>
              <span className="text-sm font-medium">Command Center</span>
            </button>
            <button className="p-3 bg-secondary text-white rounded-md hover:bg-secondary-dark flex flex-col items-center justify-center">
              <span className="material-icons mb-1">storage</span>
              <span className="text-sm font-medium">GTFS Database</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlRoomModal;
