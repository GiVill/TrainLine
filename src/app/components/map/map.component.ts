import { Component, OnInit, OnDestroy, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StationService } from '../../services/station.service';
import { Station } from '../../model/models ';

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
  private trainMarker: any = null;
  private animationInterval: any = null;
  private selectedRouteId: string | null = null;

  stations: Station[] = [];
  loading = true;
  error = '';

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
    this.stopTrainAnimation();
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
  }

  private addStationMarkers() {
    if (!this.map) return;

    this.stations.forEach(station => {
      try {
        const marker = L.marker([station.stop_lat, station.stop_lon])
          .bindPopup(`
            <div class="station-popup">
              <h3>${station.stop_name}</h3>
              <p>Zona: ${station.zone_id}</p>
              <p>Stato: <span class="status active">Attiva</span></p>
              <p>Tipo: Stazione Ferroviaria</p>
            </div>
          `)
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
    this.stopTrainAnimation();


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
      this.stopTrainAnimation();
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
      this.startTrainAnimation(route.points);
    }
  }

  // ———————————————————————————————————————————
  // Train Icon usando il file PNG

  private createPngTrainIcon() {
    return L.icon({
      iconUrl: 'assets/train_icon.png',  // Percorso del tuo file PNG
      iconSize: [48, 32],                // Dimensioni dell'icona [larghezza, altezza]
      iconAnchor: [24, 16],              // Punto di ancoraggio [x, y] dal top-left
      popupAnchor: [0, -16],             // Punto per i popup relativamente all'anchor
      shadowUrl: undefined,              // Nessuna ombra predefinita
      shadowSize: undefined,
      shadowAnchor: undefined,
      className: 'train-png-icon'        // Classe CSS personalizzata
    });
  }

  // Versione migliorata con effetti CSS
  private createEnhancedPngTrainIcon() {
    // Creiamo un div personalizzato che contiene l'immagine PNG
    const trainHtml = `
      <div style="
        width: 64px;
        height: 42px;
        background: url('assets/train_icon2.png') no-repeat center / contain;
        filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
        transition: transform 0.3s ease;
        transform-origin: center center;
      " class="enhanced-png-train"></div>
      
      <style>
        .enhanced-png-train:hover {
          transform: scale(1.05);
        }
        
        @keyframes trainPulse {
          0%, 100% { 
            filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
          }
          50% { 
            filter: drop-shadow(2px 2px 8px rgba(196,30,58,0.4));
          }
        }
        
        .train-moving {
          animation: trainPulse 2s ease-in-out infinite;
        }
      </style>
    `;

    return L.divIcon({
      html: trainHtml,
      className: 'enhanced-train-png-container',
      iconSize: [48, 32],
      iconAnchor: [24, 16]
    });
  }

  // ———————————————————————————————————————————
  // Train animation con immagine PNG

  private startTrainAnimation(points: [number, number][]) {
    if (!points.length) return;

    this.stopTrainAnimation(false);

    // Puoi scegliere tra due versioni:
    const trainIcon = this.createPngTrainIcon();         // Versione semplice con L.icon
    //const trainIcon = this.createEnhancedPngTrainIcon();    // Versione con effetti CSS

    this.trainMarker = L.marker(points[0], { 
      icon: trainIcon,
      zIndexOffset: 1000
    }).addTo(this.map);

    // Aggiungi classe per animazione se usi la versione enhanced
    const iconElement = this.trainMarker.getElement();
    if (iconElement) {
      const trainDiv = iconElement.querySelector('.enhanced-png-train');
      if (trainDiv) {
        trainDiv.classList.add('train-moving');
      }
    }

    let idx = 0;
    this.animationInterval = setInterval(() => {
      idx += 1;
      if (idx >= points.length) {
        this.stopTrainAnimation();
        return;
      }
      
      // Calcola la direzione per ruotare il treno
      const currentPoint = points[idx - 1];
      const nextPoint = points[idx];
      const angle = this.calculateBearing(currentPoint, nextPoint);
      
      // Applica la rotazione al marker
      if (iconElement) {
        const trainDiv = iconElement.querySelector('.enhanced-png-train') || iconElement.querySelector('img');
        if (trainDiv) {
          trainDiv.style.transform = `rotate(${angle}deg) scale(1)`;
          trainDiv.style.transformOrigin = 'center center';
          trainDiv.style.transition = 'transform 0.5s ease';
        }
        iconElement.style.zIndex = '1000';
      }
      
      // Muovi il treno al punto successivo
      this.trainMarker.setLatLng(points[idx]);
    }, 1200);
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
    
    // Aggiusta per la rappresentazione del treno nella tua immagine PNG
    // Potrebbe essere necessario aggiustare questo valore in base all'orientamento
    // della tua immagine (se il treno "guarda" verso l'alto, sinistra, destra, ecc.)
    return bearing - 90; // Aggiusta questo valore se necessario
  }

  /**
   * Interrompe l'animazione del treno.
   * @param restoreHidden Se true (default) ripristina le tratte nascoste.
   */
  private stopTrainAnimation(restoreHidden: boolean = true) {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
    if (this.trainMarker) {
      this.map.removeLayer(this.trainMarker);
      this.trainMarker = null;
    }

    if (restoreHidden) {
      // Ripristina le tratte nascoste
      this.hiddenRoutes.forEach(id => {
        const route = this.routePolylines[id];
        if (route && !this.map.hasLayer(route.polyline)) {
          route.polyline.addTo(this.map);
          route.polyline.setStyle({ color: '#dc3545', weight: 3, opacity: 0.8 });
        }
      });
      // Ripristina stile della linea selezionata, se presente
      if (this.selectedRouteId && this.routePolylines[this.selectedRouteId]) {
        this.routePolylines[this.selectedRouteId].polyline.setStyle({ color: '#dc3545', weight: 3, opacity: 0.8 });
      }
      this.selectedRouteId = null;
      this.hiddenRoutes = [];
    }
  }
}