import { Component, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './Components/header/header.component';
import { SidebarComponent } from './Components/sidebar/sidebar.component';
import { MapComponent } from './Components/map/map.component';
import { StationDetailComponent } from './Components/station-detail/station-detail.component';
import { Station } from './model/models ';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    SidebarComponent,
    MapComponent,
    StationDetailComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  @ViewChild('mapComponent') mapComponent!: MapComponent;
  
  selectedStation = signal<Station | null>(null);
  showStationDetail = signal<boolean>(false);

  onStationSelected(station: Station) {
    this.selectedStation.set(station);
    this.showStationDetail.set(true);
  }

  // Nuovo metodo per gestire il focus sulla mappa
  onStationFocused(station: Station) {
    console.log('Focus su stazione dalla sidebar:', station);
    // Chiama il metodo focusOnStation della mappa
    if (this.mapComponent) {
      this.mapComponent.focusOnStation(station);
    }
  }

  onBackToStations() {
    this.showStationDetail.set(false);
    this.selectedStation.set(null);
  }

  // app.component.ts
  onRouteSelected(shapeId: string) {
    if (this.mapComponent) {
      this.mapComponent.selectRoute(shapeId);
      
      // Opzionale: nascondi il pannello dettaglio stazione
      this.showStationDetail.set(false);
      this.selectedStation.set(null);
    }
  }
}