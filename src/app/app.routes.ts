import { Routes } from '@angular/router';
import { SortingDeviationComponent } from './pages/sorting-deviation/sorting-deviation.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'sorting-deviation',
    pathMatch: 'full',
  },
  {
    path: 'sorting-deviation',
    component: SortingDeviationComponent,
  },
  { path: '**', redirectTo: 'sorting-deviation', pathMatch: 'full' },
];
