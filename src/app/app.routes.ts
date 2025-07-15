// src/app/app.routes.ts
import { Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { StationDetailComponent } from './components/station-detail/station-detail.component';


export const routes: Routes = [
  { path: '', component: AppComponent },
  { path: 'station/:id', component: StationDetailComponent },
  { path: '**', redirectTo: '' }
];
