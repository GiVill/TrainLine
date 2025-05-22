import { Component, signal } from '@angular/core';
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
  selectedStation = signal<Station | null>(null);
  showStationDetail = signal<boolean>(false);

  onStationSelected(station: Station) {
    this.selectedStation.set(station);
    this.showStationDetail.set(true);
  }

  onBackToStations() {
    this.showStationDetail.set(false);
    this.selectedStation.set(null);
  }
}
