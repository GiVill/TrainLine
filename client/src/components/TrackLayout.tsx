import { useState } from "react";

interface TrackLayoutProps {
  stationId: string;
}

const TrackLayout = ({ stationId }: TrackLayoutProps) => {
  // This would be real track layout data in production
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
      <div className="h-80 relative">
        <img 
          src="https://pixabay.com/get/g9965e7d40fda837ec12286ba90fe6bc2a83e7e3ba1b6cb378e50ea842aae5fe17303a84c8a68882fbb9cf51225d2bdfba3d742b88fcf46cf976e743bbefc7bf3_1280.jpg" 
          alt="Detailed track layout" 
          className="w-full h-full object-cover"
        />
        
        {/* Track overlay (would be interactive with Mapbox) */}
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <button 
            className="px-4 py-2 bg-white rounded-md shadow-lg text-sm font-medium flex items-center"
            onClick={() => setIsExpanded(true)}
          >
            <span className="material-icons text-primary mr-1">fullscreen</span>
            View Interactive Layout
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-center text-sm">
          <div>
            <span className="font-medium">Track Layout ID:</span> {stationId.substring(3)}-TL-001
          </div>
          <div className="space-x-2">
            <button className="px-3 py-1 bg-neutral-100 rounded text-xs font-medium hover:bg-neutral-200">
              Download SVG
            </button>
            <button className="px-3 py-1 bg-neutral-100 rounded text-xs font-medium hover:bg-neutral-200">
              Technical View
            </button>
          </div>
        </div>
      </div>
      
      {/* Full-screen modal for the track layout */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
              <h3 className="text-lg font-bold">Detailed Track Layout</h3>
              <button 
                className="p-2 rounded-full hover:bg-neutral-100"
                onClick={() => setIsExpanded(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden relative">
              {/* This would be replaced with an interactive SVG or Mapbox GL instance showing the detailed track layout */}
              <img 
                src="https://pixabay.com/get/g27e8d8a8e7e4a4f76c4bfc7e731bfdfcaec6e4bef95a3307d36b4e9b4ef10e8c7f602b2cc23b0c07842e293fbd2d46d7_1280.jpg" 
                alt="Detailed track layout" 
                className="w-full h-full object-cover"
              />
              
              <svg 
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 1000 600"
              >
                {/* Sample track layout - would be generated from real data */}
                <g stroke="#333" strokeWidth="2" fill="none">
                  {/* Main tracks */}
                  <path d="M 100,300 L 900,300" strokeWidth="3" />
                  
                  {/* Platform tracks */}
                  <path d="M 200,250 L 800,250" />
                  <path d="M 200,350 L 800,350" />
                  <path d="M 300,200 L 700,200" />
                  <path d="M 300,400 L 700,400" />
                  
                  {/* Switches and connections */}
                  <path d="M 200,300 L 300,250" />
                  <path d="M 200,300 L 300,350" />
                  <path d="M 300,250 L 350,200" />
                  <path d="M 300,350 L 350,400" />
                  
                  <path d="M 800,300 L 700,250" />
                  <path d="M 800,300 L 700,350" />
                  <path d="M 700,250 L 650,200" />
                  <path d="M 700,350 L 650,400" />
                </g>
                
                {/* Platforms */}
                <g fill="#DA1D2A" fillOpacity="0.2" stroke="#DA1D2A" strokeWidth="1">
                  <rect x="350" y="170" width="300" height="20" />
                  <rect x="350" y="220" width="300" height="20" />
                  <rect x="350" y="320" width="300" height="20" />
                  <rect x="350" y="370" width="300" height="20" />
                </g>
                
                {/* Signals */}
                <g fill="#4CAF50">
                  <circle cx="250" cy="250" r="5" />
                  <circle cx="250" cy="350" r="5" />
                  <circle cx="750" cy="250" r="5" />
                  <circle cx="750" cy="350" r="5" />
                </g>
                
                {/* Platform labels */}
                <g fill="#000" fontFamily="sans-serif" fontSize="12" textAnchor="middle">
                  <text x="500" y="185">Platform 1</text>
                  <text x="500" y="235">Platform 2</text>
                  <text x="500" y="335">Platform 3</text>
                  <text x="500" y="385">Platform 4</text>
                </g>
              </svg>
            </div>
            
            <div className="p-4 border-t border-neutral-200 bg-neutral-50">
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <span className="font-medium">Station:</span> {stationId}
                </div>
                <div className="space-x-2">
                  <button className="px-3 py-1 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark">
                    Export
                  </button>
                  <button className="px-3 py-1 bg-secondary text-white rounded text-sm font-medium hover:bg-secondary-dark">
                    Edit Layout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackLayout;
