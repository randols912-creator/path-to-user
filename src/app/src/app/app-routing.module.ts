import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {
  homePath,
  mapPath,
  menuPath,
  profilePath,
  relationPath,
  settingsPath,
  welcomePath,
  welcomeUrl
} from './app.constants';
import { AuthGuard } from './auth/auth.guard';
import { HomeComponent } from './components/containers/home/home.component';
import { MapComponent } from './components/containers/map/map.component';
import { MenuComponent } from './components/containers/menu/menu.component';
import { ProfileComponent } from './components/containers/profile/profile.component';
import { RelationComponent } from './components/containers/relation/relation.component';
import { SettingsComponent } from './components/containers/settings/settings.component';
import { WelcomeComponent } from './components/containers/welcome/welcome.component';

const routes: Routes = [
  {
    path: homePath,
    component: HomeComponent,
    canActivate: [AuthGuard],
    data: { animation: 'home' },
  },
  {
    path: menuPath,
    component: MenuComponent,
    data: { animation: 'menu' },
  },
  {
    path: `${relationPath}/:id`,
    component: RelationComponent,
    canActivate: [AuthGuard],
  },
  {
    path: `${profilePath}/:id`,
    component: ProfileComponent,
    canActivate: [AuthGuard],
  },
  {
    path: `${settingsPath}`,
    component: SettingsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: `${mapPath}/:id`,
    component: MapComponent,
    canActivate: [AuthGuard],
  },
  { path: welcomePath, component: WelcomeComponent },
  { path: '**', redirectTo: welcomeUrl },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
