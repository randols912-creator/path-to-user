import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {
  HOME_PATH,
  MAP_PATH,
  MENU_PATH,
  PROFILE_PATH,
  RELATION_PATH,
  SETTINGS_PATH,
  WELCOME_PATH,
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
    path: HOME_PATH,
    component: HomeComponent,
    canActivate: [AuthGuard],
    data: { animation: 'home' },
  },
  {
    path: MENU_PATH,
    component: MenuComponent,
    data: { animation: 'menu' },
  },
  {
    path: `${RELATION_PATH}/:id`,
    component: RelationComponent,
    canActivate: [AuthGuard],
  },
  {
    path: `${PROFILE_PATH}/:id`,
    component: ProfileComponent,
    canActivate: [AuthGuard],
  },
  {
    path: `${SETTINGS_PATH}`,
    component: SettingsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: `${MAP_PATH}/:id`,
    component: MapComponent,
    canActivate: [AuthGuard],
  },
  { path: WELCOME_PATH, component: WelcomeComponent },
  { path: '**', redirectTo: `/${WELCOME_PATH}` },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
