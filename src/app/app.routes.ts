// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { OverviewComponent } from './Components/overview/overview.component';
import { StationdetailComponent } from './Components/stationdetail/stationdetail.component';


export const routes: Routes = [
  { path: '', component: OverviewComponent },
  { path: 'station/:id', component: StationdetailComponent },
  { path: '**', redirectTo: '' }
];
