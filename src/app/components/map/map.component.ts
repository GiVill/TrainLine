import { Component, OnInit, OnDestroy, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StationService } from '../../services/station.service';
import { Station } from '../../model/models';
import * as leaflet from 'leaflet';

declare var L: any;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, OnDestroy {
  private stationService = inject(StationService);
  stationSelected = output<Station>();

  private map: any;
  private markers: any[] = [];
  private routePolylines: { [id: string]: { polyline: any; points: [number, number][] } } = {};
  private hiddenRoutes: string[] = [];
  private trainMarkers: { [id: string]: any } = {}; // Supporto per più treni
  private animationIntervals: { [id: string]: any } = {}; // Supporto per più animazioni
  private selectedRouteId: string | null = null;

  // Aggiungi dopo le altre proprietà private
  private completedTrains: Set<string> = new Set();
  private totalTrainsInSimulation = 3; // Numero totale di treni nella simulazione

  private cagliariStation: Station | null = null;

  stations: Station[] = [];
  loading = true;
  error = '';
  isSimulationRunning = false;

  ngOnInit() {
    // Delay to ensure DOM is ready
    setTimeout(() => {
      this.initializeMap();
      this.loadStations();
    }, 100);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
    this.stopAllTrainAnimations();
  }

  // ———————————————————————————————————————————
  // Data loading

  loadStations() {
    this.stationService.getStations().subscribe({
      next: (stations) => {
        this.stations = stations;
        this.loading = false;
        this.addStationMarkers();
      },
      error: (err) => {
        this.error = 'Errore nel caricamento delle stazioni.';
        this.loading = false;
        console.error('Error loading stations:', err);
      }
    });
  }

  private loadRoutes() {
    this.stationService.getShapes().subscribe({
      next: (shapes) => this.addRouteLines(shapes),
      error: (err) => console.error('Error loading routes:', err)
    });
  }

  // ———————————————————————————————————————————
  // Map initialisation

  private initializeMap() {
    this.map = L.map('map').setView([40.1209, 9.0129], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Aggiungi il pulsante di simulazione
    this.addSimulationButton();
  }

  private addSimulationButton() {
    const simulationControl = L.control({ position: 'topright' });
    
    simulationControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'simulation-control');
      div.innerHTML = `
        <div class="simulation-panel">
          <button id="simulationBtn" class="simulation-btn ${this.isSimulationRunning ? 'running' : ''}">
            <span class="btn-icon">🚂</span>
            <span class="btn-text">${this.isSimulationRunning ? 'Ferma Simulazione' : 'Avvia Simulazione'}</span>
          </button>
          
          <div id="trainStatusPanel" class="train-status-panel ${this.isSimulationRunning ? 'visible' : ''}">
            <div class="train-status-item" id="trainStatus1">
              <div class="train-indicator olbia-train"></div>
              <div class="train-info">
                <span class="train-route">Olbia → Cagliari</span>
                <span class="train-status">In partenza...</span>
              </div>
            </div>
            
            <div class="train-status-item" id="trainStatus2">
              <div class="train-indicator sassari-train"></div>
              <div class="train-info">
                <span class="train-route">Sassari → Cagliari</span>
                <span class="train-status">In attesa...</span>
              </div>
            </div>

            <div class="train-status-item" id="trainStatus3">
              <div class="train-indicator iglesias-train"></div>
              <div class="train-info">
                <span class="train-route">Iglesias → Cagliari</span>
                <span class="train-status">In attesa...</span>
              </div>
            </div>
          </div>
        </div>
        
        <style>
          .simulation-control {
            background: none;
            border: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          .simulation-panel {
            display: flex;
            flex-direction: column;
            gap: 12px;
            min-width: 320px;
          }
          
          .simulation-btn {
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            color: white;
            border: 2px solid white; 
            padding: 16px 24px;
            border-radius: 16px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 6px 20px rgba(231, 76, 60, 0.3);
            transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            gap: 10px;
            min-height: 56px;
          }
          
          .simulation-btn:before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
          }
          
          .simulation-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(231, 76, 60, 0.4);
          }
          
          .simulation-btn:hover:before {
            left: 100%;
          }
          
          .simulation-btn.running {
            background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
            box-shadow: 0 6px 20px rgba(0, 184, 148, 0.3);
            animation: pulseGreen 2s infinite;
          }
          
          .simulation-btn.running:hover {
            box-shadow: 0 10px 30px rgba(0, 184, 148, 0.4);
          }
          
          .simulation-btn.activating {
            animation: buttonActivate 0.6s ease-out;
          }
          
          @keyframes pulseGreen {
            0%, 100% {
              box-shadow: 0 6px 20px rgba(0, 184, 148, 0.3);
            }
            50% {
              box-shadow: 0 6px 25px rgba(0, 184, 148, 0.5);
            }
          }
          
          @keyframes buttonActivate {
            0% {
              transform: scale(1);
              background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            }
            50% {
              transform: scale(1.05);
              background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
            }
            100% {
              transform: scale(1);
              background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
            }
          }
          
          .btn-icon {
            font-size: 20px;
            transition: transform 0.3s ease;
          }
          
          .simulation-btn.running .btn-icon {
            animation: trainMove 1s infinite linear;
          }
          
          @keyframes trainMove {
            0% { transform: translateX(0px); }
            50% { transform: translateX(3px); }
            100% { transform: translateX(0px); }
          }
          
          .btn-text {
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          
          .train-status-panel {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            max-height: 0;
            overflow: hidden;
          }
          
          .train-status-panel.visible {
            opacity: 1;
            transform: translateY(0);
            max-height: 240px;
          }
          
          .train-status-item {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 14px 0;
            border-bottom: 1px solid rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
          }
          
          .train-status-item:last-child {
            border-bottom: none;
          }
          
          .train-status-item.arriving {
            background: linear-gradient(90deg, rgba(255, 193, 7, 0.15), transparent);
            border-radius: 12px;
            padding: 14px 12px;
            margin: 0 -6px;
            animation: arrivalPulse 1s infinite;
          }
          
          @keyframes arrivalPulse {
            0%, 100% {
              background: linear-gradient(90deg, rgba(255, 193, 7, 0.15), transparent);
            }
            50% {
              background: linear-gradient(90deg, rgba(255, 193, 7, 0.25), transparent);
            }
          }
          
          .train-indicator {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            position: relative;
            transition: all 0.3s ease;
          }
          
          .train-indicator:before {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            animation: ripple 2s infinite;
          }
          
          .olbia-train {
            background: #dc3545;
          }
          
          .olbia-train:before {
            background: rgba(220, 53, 69, 0.3);
          }
          
          .sassari-train {
            background: #007bff;
          }
          
          .sassari-train:before {
            background: rgba(0, 123, 255, 0.3);
          }

          .iglesias-train {
            background: #777777ff;
          }

          .iglesias-train:before {
            background: rgba(21, 22, 21, 0.3);
          }
          
          .train-indicator.active {
            box-shadow: 0 0 15px currentColor;
          }
          
          @keyframes ripple {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            100% {
              transform: scale(2);
              opacity: 0;
            }
          }
          
          .train-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          
          .train-route {
            font-weight: 600;
            color: #2d3436;
            font-size: 15px;
          }
          
          .train-status {
            font-size: 13px;
            color: #636e72;
            font-weight: 500;
            transition: all 0.3s ease;
          }
          
          .train-status.arriving {
            color: #ffc107;
            font-weight: 600;
            animation: statusBlink 0.5s infinite alternate;
          }
          
          @keyframes statusBlink {
            0% { opacity: 1; }
            100% { opacity: 0.7; }
          }
          
          .train-status.completed {
            color: #00b894;
            font-weight: 600;
          }
        </style>
      `;

      // Previeni la propagazione degli eventi del mouse sulla mappa
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      return div;
    };

    simulationControl.addTo(this.map);

    // Aggiungi event listener dopo che il controllo è stato aggiunto
    setTimeout(() => {
      const btn = document.getElementById('simulationBtn');
      if (btn) {
        btn.addEventListener('click', () => {
          // Aggiungi animazione di attivazione
          btn.classList.add('activating');
          setTimeout(() => {
            btn.classList.remove('activating');
          }, 600);
          
          this.toggleSimulation();
        });
      }
    }, 100);
  }

  private updateTrainStatus(trainId: string, status: string, isArriving: boolean = false) {
    let statusElement;
    
    if (trainId === 'olbia_cagliari') {
      statusElement = document.getElementById('trainStatus1');
    } else if (trainId === 'sassari_cagliari') {
      statusElement = document.getElementById('trainStatus2');
    } else if (trainId === 'iglesias_cagliari') {
      statusElement = document.getElementById('trainStatus3');
    }
    
    if (!statusElement) return;

    const statusText = statusElement.querySelector('.train-status') as HTMLElement;
    const indicator = statusElement.querySelector('.train-indicator') as HTMLElement;
    
    if (statusText) {
      statusText.textContent = status;
      statusText.classList.toggle('arriving', isArriving);
      statusText.classList.toggle('completed', status.includes('Arrivato'));
    }
    
    if (indicator) {
      indicator.classList.toggle('active', isArriving);
    }
    
    statusElement.classList.toggle('arriving', isArriving);
  }

  private addStationMarkers() {
    if (!this.map) return;

    this.stations.forEach(station => {
      try {
        const marker = L.marker([station.stop_lat, station.stop_lon])
          .on('click', () => this.onStationClick(station));

        marker.addTo(this.map);
        this.markers.push(marker);
      } catch (error) {
        console.error("Errore nell'aggiunta del marcatore per", station.stop_name, error);
      }
    });

    // Carica le tratte
    this.loadRoutes();
  }

  // ———————————————————————————————————————————
  // Station selection and zoom

  private onStationClick(station: Station) {
    // Emetti l'evento per la sidebar
    this.stationSelected.emit(station);

    // Zoom sulla stazione selezionata
    this.zoomToStation(station);
  }

  private zoomToStation(station: Station) {
    if (!this.map) return;

    // Ferma eventuali animazioni del treno in corso
    this.stopAllTrainAnimations();

    // Crea un marker di evidenziazione più grande per la stazione selezionata
    const highlightIcon = L.divIcon({
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: #C41E3A;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(196, 30, 58, 0.6);
          animation: pulse 2s infinite;
        "></div>
        <style>
          @keyframes pulse {
            0% {
              box-shadow: 0 0 15px rgba(196, 30, 58, 0.6);
              transform: scale(1);
            }
            50% {
              box-shadow: 0 0 25px rgba(196, 30, 58, 0.8);
              transform: scale(1.1);
            }
            100% {
              box-shadow: 0 0 15px rgba(196, 30, 58, 0.6);
              transform: scale(1);
            }
          }
        </style>
      `,
      className: 'highlighted-station-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    // Centra e zooma sulla stazione
    this.map.setView([station.stop_lat, station.stop_lon], 14, {
      animate: true,
      duration: 1.5,
      easeLinearity: 0.25
    });
  }

  // Metodo pubblico per permettere alla sidebar di zoomare su una stazione
  public focusOnStation(station: Station) {
    this.zoomToStation(station);
  }

  // ———————————————————————————————————————————
  // Route drawing & interaction

  private addRouteLines(shapes: any[]) {
    if (!this.map) return;

    const routeGroups: { [key: string]: any[] } = {};
    shapes.forEach(shape => {
      if (!routeGroups[shape.shape_id]) {
        routeGroups[shape.shape_id] = [];
      }
      routeGroups[shape.shape_id].push(shape);
    });

    Object.keys(routeGroups).forEach(shapeId => {
      const routePoints: [number, number][] = routeGroups[shapeId]
        .sort((a, b) => a.shape_pt_sequence - b.shape_pt_sequence)
        .map((p: any) => [p.shape_pt_lat, p.shape_pt_lon]);

      if (routePoints.length > 1) {
        const polyline = L.polyline(routePoints, {
          color: '#dc3545',
          weight: 3,
          opacity: 0.8
        }).addTo(this.map);

        // Salva per riferimento e aggiungi interazione
        this.routePolylines[shapeId] = { polyline, points: routePoints };
        polyline.on('click', () => this.selectRoute(shapeId));
      }
    });
  }

  public selectRoute(shapeId: string) {
    // Se c'è già una tratta in esecuzione, assicurati che tutto torni visibile prima di nascondere di nuovo
    if (this.selectedRouteId !== shapeId) {
      this.stopAllTrainAnimations();
    }

    this.selectedRouteId = shapeId;
    this.hiddenRoutes = [];

    Object.keys(this.routePolylines).forEach(id => {
      const { polyline } = this.routePolylines[id];

      if (id === shapeId) {
        // Linea selezionata in blu
        polyline.setStyle({ color: '#007bff', weight: 5, opacity: 1 });
        if (!this.map.hasLayer(polyline)) polyline.addTo(this.map);
      } else {
        // Rimuovi le altre linee dalla mappa e memorizza per ripristino
        if (this.map.hasLayer(polyline)) {
          this.map.removeLayer(polyline);
          this.hiddenRoutes.push(id);
        }
      }
    });

    // Centro e zoom sulla tratta selezionata
    const route = this.routePolylines[shapeId];
    if (route) {
      const bounds = route.polyline.getBounds();
      this.map.fitBounds(bounds, { padding: [50, 50] });
      this.startTrainAnimation(route.points, `route_${shapeId}`);
    }
  }

  // ———————————————————————————————————————————
  // Simulation methods

  private toggleSimulation() {
    if (this.isSimulationRunning) {
      this.stopSimulation();
    } else {
      this.startSimulation();
    }
  }

  private startSimulation() {
    if (this.isSimulationRunning) return;

    this.isSimulationRunning = true;
    this.updateSimulationButton();

    // Trova le stazioni di Olbia, Sassari, Iglesias e Cagliari
    const olbiaStation = this.stations.find(s => s.stop_name.toLowerCase().includes('olbia'));
    const sassariStation = this.stations.find(s => s.stop_name.toLowerCase().includes('sassari'));
    const iglesiasStation = this.stations.find(s => s.stop_name.toLowerCase().includes('iglesias'));
    const cagliariStation = this.stations.find(s => s.stop_name.toLowerCase().includes('cagliari'));

    this.cagliariStation = cagliariStation || null;

    if (!olbiaStation || !sassariStation || !iglesiasStation || !cagliariStation) {
      console.error('Non sono state trovate tutte le stazioni necessarie per la simulazione');
      this.stopSimulation();
      return;
    }

    // Trova le rotte che vanno verso Cagliari
    const olbiaCagliariRoute = this.findRouteToDestination(olbiaStation, cagliariStation);
    const sassariCagliariRoute = this.findRouteToDestination(sassariStation, cagliariStation);
    const iglesiasCarliariRoute = this.findRouteToDestination(iglesiasStation, cagliariStation);

    if (!olbiaCagliariRoute || !sassariCagliariRoute || !iglesiasCarliariRoute) {
      console.error('Non sono state trovate le rotte necessarie per la simulazione');
      this.stopSimulation();
      return;
    }

    // Aggiorna lo stato del primo treno
    this.updateTrainStatus('olbia_cagliari', 'In partenza da Olbia...');
    
    // Avvia il primo treno (Olbia -> Cagliari)
    this.startTrainAnimationWithStatus(olbiaCagliariRoute.points, 'olbia_cagliari', 'Olbia');

    // Aggiorna lo stato del secondo treno
    setTimeout(() => {
      this.updateTrainStatus('sassari_cagliari', 'In partenza da Sassari...');
    }, 1000);

    // Avvia il secondo treno dopo 4 secondi (Sassari -> Cagliari)
    setTimeout(() => {
      if (this.isSimulationRunning) {
        this.startTrainAnimationWithStatus(sassariCagliariRoute.points, 'sassari_cagliari', 'Sassari');
      }
    }, 4000);

    // Aggiorna lo stato del terzo treno
    setTimeout(() => {
      this.updateTrainStatus('iglesias_cagliari', 'In partenza da Iglesias...');
    }, 4500);

    // Avvia il terzo treno dopo 5 secondi (Iglesias -> Cagliari)
    setTimeout(() => {
      if (this.isSimulationRunning) {
        this.startTrainAnimationWithStatus(iglesiasCarliariRoute.points, 'iglesias_cagliari', 'Iglesias');
      }
    }, 25000);

    // Mostra tutte le rotte durante la simulazione
    this.showAllRoutes();
  }

  private stopSimulation() {
    this.isSimulationRunning = false;
    this.updateSimulationButton();
    this.stopAllTrainAnimations();
    
    // Aggiungi questa riga per pulire anche i treni completati quando si ferma manualmente
    this.completedTrains.clear();
  }

  private updateSimulationButton() {
    const btn = document.getElementById('simulationBtn');
    const statusPanel = document.getElementById('trainStatusPanel');
    
    if (btn) {
      const btnText = btn.querySelector('.btn-text') as HTMLElement;
      if (btnText) {
        btnText.textContent = this.isSimulationRunning ? 'Ferma Simulazione' : 'Avvia Simulazione';
      }
      btn.className = `simulation-btn ${this.isSimulationRunning ? 'running' : ''}`;
    }
    
    if (statusPanel) {
      statusPanel.classList.toggle('visible', this.isSimulationRunning);
    }
    
    // Reset status quando si ferma la simulazione
    if (!this.isSimulationRunning) {
      this.updateTrainStatus('olbia_cagliari', 'In attesa...');
      this.updateTrainStatus('sassari_cagliari', 'In attesa...');
      this.updateTrainStatus('iglesias_cagliari', 'In attesa...');
    }
  }

  private findRouteToDestination(startStation: Station, endStation: Station): { polyline: any; points: [number, number][] } | null {
    // Trova la rotta più vicina che collega le due stazioni
    // Questo è un metodo semplificato - potresti voler implementare una logica più sofisticata
    const tolerance = 0.01; // Tolleranza per la ricerca delle stazioni vicine

    for (const [shapeId, route] of Object.entries(this.routePolylines)) {
      const { points } = route;
      
      // Trova punti vicini alla stazione di partenza e di arrivo
      const startIndex = points.findIndex(point => 
        Math.abs(point[0] - startStation.stop_lat) < tolerance &&
        Math.abs(point[1] - startStation.stop_lon) < tolerance
      );
      
      const endIndex = points.findIndex(point => 
        Math.abs(point[0] - endStation.stop_lat) < tolerance &&
        Math.abs(point[1] - endStation.stop_lon) < tolerance
      );

      if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        // Estrai solo la porzione di rotta tra le due stazioni
        const routeSegment = points.slice(startIndex, endIndex + 1);
        return { polyline: route.polyline, points: routeSegment };
      }
    }

    // Se non trova una rotta esatta, restituisce la prima rotta disponibile
    // (fallback - dovresti personalizzare questo in base ai tuoi dati)
    const routeIds = Object.keys(this.routePolylines);
    if (routeIds.length > 0) {
      return this.routePolylines[routeIds[0]];
    }

    return null;
  }

  private showAllRoutes() {
    // Ripristina tutte le rotte visibili
    Object.values(this.routePolylines).forEach(route => {
      if (!this.map.hasLayer(route.polyline)) {
        route.polyline.addTo(this.map);
      }
      route.polyline.setStyle({ color: '#dc3545', weight: 3, opacity: 0.8 });
    });
    
    this.hiddenRoutes = [];
    this.selectedRouteId = null;
  }

  // ———————————————————————————————————————————
  // Train Icon usando il file PNG

  private createPngTrainIcon(trainId: string = 'default') {
    // Mappa dei file icona per ogni treno
    const iconFiles = {
      'olbia_cagliari': 'assets/train_icon.png',
      'sassari_cagliari': 'assets/train_blu.png',
      'iglesias_cagliari': 'assets/train_grigio.png',
      'default': 'assets/train_icon.png'
    };

    const iconUrl = iconFiles[trainId as keyof typeof iconFiles] || iconFiles.default;

    return L.icon({
      iconUrl: iconUrl,
      iconSize: [48, 32],
      iconAnchor: [24, 16],
      popupAnchor: [0, -16],
      shadowUrl: undefined,
      shadowSize: undefined,
      shadowAnchor: undefined,
      className: `train-png-icon train-${trainId}`
    });
  }

  // ———————————————————————————————————————————
  // Train animation con movimento fluido (modificato per supportare più treni)

  private startTrainAnimation(points: L.LatLngExpression[], trainId: string = 'default') {
    if (!points.length) return;
    this.stopTrainAnimation(trainId, false);

    const trainIcon = this.createPngTrainIcon(trainId);
    this.trainMarkers[trainId] = L.marker(points[0], { icon: trainIcon, zIndexOffset: 1000 }).addTo(this.map);

    const iconElement = this.trainMarkers[trainId].getElement();
    let idx = 0;

    const animateSegment = (from: L.LatLng, to: L.LatLng) => {
      const duration = 1000; // durata in ms per ogni segmento
      const startTime = performance.now();

      const step = (now: number) => {
        if (!this.trainMarkers[trainId]) return; // Controllo se il treno esiste ancora

        const t = Math.min((now - startTime) / duration, 1);
        // interpolazione lineare
        const lat = from.lat + (to.lat - from.lat) * t;
        const lng = from.lng + (to.lng - from.lng) * t;
        this.trainMarkers[trainId].setLatLng([lat, lng]);

        // calcola e applica rotazione
        const angle = this.calculateBearing([from.lat, from.lng], [to.lat, to.lng]);
        if (iconElement) {
          const trainDiv = iconElement.querySelector('.enhanced-png-train') || iconElement.querySelector('img');
          if (trainDiv) {
            trainDiv.style.transform = `rotate(${angle}deg)`;
            trainDiv.style.transition = '';
          }
        }

        if (t < 1) {
          this.animationIntervals[trainId] = requestAnimationFrame(step);
        } else {
          // segmento completato, vai al prossimo
          idx++;
          if (idx < points.length - 1) {
            animateSegment(
              L.latLng(points[idx]),
              L.latLng(points[idx + 1])
            );
          } else {
            // fine della tratta
            this.stopTrainAnimation(trainId);
          }
        }
      };

      this.animationIntervals[trainId] = requestAnimationFrame(step);
    };

    // Avvia primo segmento
    if (points.length > 1) {
      animateSegment(
        L.latLng(points[0]),
        L.latLng(points[1])
      );
    }
  }

  private startTrainAnimationWithStatus(points: L.LatLngExpression[], trainId: string, origin: string) {
    if (!points.length) return;
    this.stopTrainAnimation(trainId, false);

    const trainIcon = this.createPngTrainIcon(trainId);
    this.trainMarkers[trainId] = L.marker(points[0], { icon: trainIcon, zIndexOffset: 1000 }).addTo(this.map);

    const iconElement = this.trainMarkers[trainId].getElement();
    let idx = 0;
    const totalPoints = points.length;

    const animateSegment = (from: L.LatLng, to: L.LatLng) => {
      const duration = 1000; // durata in ms per ogni segmento
      const startTime = performance.now();
      
      // Calcola la percentuale di completamento del viaggio
      const progress = (idx / (totalPoints - 1)) * 100;
      
      // Aggiorna lo stato in base al progresso
      if (progress < 10) {
        this.updateTrainStatus(trainId, `Partito da ${origin}...`);
      } else if (progress < 80) {
        this.updateTrainStatus(trainId, `In viaggio verso Cagliari... (${Math.round(progress)}%)`);
      } else if (progress < 95) {
        this.updateTrainStatus(trainId, `In arrivo a Cagliari...`, true);
      }

      const step = (now: number) => {
        if (!this.trainMarkers[trainId]) return; // Controllo se il treno esiste ancora

        const t = Math.min((now - startTime) / duration, 1);
        // interpolazione lineare
        const lat = from.lat + (to.lat - from.lat) * t;
        const lng = from.lng + (to.lng - from.lng) * t;
        this.trainMarkers[trainId].setLatLng([lat, lng]);

        // calcola e applica rotazione
        const angle = this.calculateBearing([from.lat, from.lng], [to.lat, to.lng]);
        if (iconElement) {
          const trainDiv = iconElement.querySelector('.enhanced-png-train') || iconElement.querySelector('img');
          if (trainDiv) {
            trainDiv.style.transform = `rotate(${angle}deg)`;
            trainDiv.style.transition = '';
          }
        }

        if (t < 1) {
          this.animationIntervals[trainId] = requestAnimationFrame(step);
        } else {
          // segmento completato, vai al prossimo
          idx++;
          if (idx < points.length - 1) {
            animateSegment(
              L.latLng(points[idx]),
              L.latLng(points[idx + 1])
            );
          } else {
            // fine della tratta
            this.updateTrainStatus(trainId, `Arrivato a Cagliari`);
            this.stopTrainAnimation(trainId);
            this.onTrainCompleted(trainId);
          }
        }
      };

      this.animationIntervals[trainId] = requestAnimationFrame(step);
    };

    // Avvia primo segmento
    if (points.length > 1) {
      animateSegment(
        L.latLng(points[0]),
        L.latLng(points[1])
      );
    }
  }

  private onTrainCompleted(trainId: string) {
    this.completedTrains.add(trainId);
    
    if (this.completedTrains.size >= this.totalTrainsInSimulation) {
      if (this.cagliariStation) {
        // Emetti l'evento per aprire la sidebar con i dettagli di Cagliari
        this.stationSelected.emit(this.cagliariStation);
        
        // Zoom sulla stazione di Cagliari
        this.zoomToStation(this.cagliariStation);
        
        // ———> Nuovo: un secondo dopo, emetto un evento per aprire il dettaglio
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent(
            'openStationDetail',
            { detail: this.cagliariStation }
          ));
        }, 1000);
      }
      
      // Attendi 4 secondi prima di resettare la simulazione
      setTimeout(() => {
        this.resetSimulation();
      }, 4000);
    }
  }


  private resetSimulation() {
    this.stopSimulation();
    this.completedTrains.clear();
    this.cagliariStation = null; // Pulisci il riferimento
    
    // Reset degli stati dei treni
    this.updateTrainStatus('olbia_cagliari', 'In attesa...');
    this.updateTrainStatus('sassari_cagliari', 'In attesa...');
    this.updateTrainStatus('iglesias_cagliari', 'In attesa...');
  }

  // Metodo per calcolare l'angolo di rotazione del treno
  private calculateBearing(point1: [number, number], point2: [number, number]): number {
    const [lat1, lon1] = point1;
    const [lat2, lon2] = point2;

    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;

    return bearing - 90;
  }

  /**
   * Interrompe l'animazione di un treno specifico.
   */
  private stopTrainAnimation(trainId: string, restoreHidden: boolean = true) {
    if (this.animationIntervals[trainId]) {
      cancelAnimationFrame(this.animationIntervals[trainId]);
      delete this.animationIntervals[trainId];
    }
    if (this.trainMarkers[trainId]) {
      this.map.removeLayer(this.trainMarkers[trainId]);
      delete this.trainMarkers[trainId];
    }

    if (restoreHidden && trainId === 'default') {
      // Ripristina le tratte nascoste solo per il treno principale
      this.hiddenRoutes.forEach(id => {
        const route = this.routePolylines[id];
        if (route && !this.map.hasLayer(route.polyline)) {
          route.polyline.addTo(this.map);
          route.polyline.setStyle({ color: '#dc3545', weight: 3, opacity: 0.8 });
        }
      });
      if (this.selectedRouteId && this.routePolylines[this.selectedRouteId]) {
        this.routePolylines[this.selectedRouteId].polyline.setStyle({ color: '#dc3545', weight: 3, opacity: 0.8 });
      }
      this.selectedRouteId = null;
      this.hiddenRoutes = [];
    }
  }

  /**
   * Interrompe tutte le animazioni dei treni.
   */
  private stopAllTrainAnimations(restoreHidden: boolean = true) {
    Object.keys(this.trainMarkers).forEach(trainId => {
      this.stopTrainAnimation(trainId, false);
    });

    if (restoreHidden) {
      this.hiddenRoutes.forEach(id => {
        const route = this.routePolylines[id];
        if (route && !this.map.hasLayer(route.polyline)) {
          route.polyline.addTo(this.map);
          route.polyline.setStyle({ color: '#dc3545', weight: 3, opacity: 0.8 });
        }
      });
      if (this.selectedRouteId && this.routePolylines[this.selectedRouteId]) {
        this.routePolylines[this.selectedRouteId].polyline.setStyle({ color: '#dc3545', weight: 3, opacity: 0.8 });
      }
      this.selectedRouteId = null;
      this.hiddenRoutes = [];
    }
  }
}