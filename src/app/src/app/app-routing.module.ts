import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {
  ABOUT_PATH,
  HOME_PATH,
  MAP_PATH,
  MENU_PATH,
  PROFILE_PATH,
  RELATION_PATH,
  SETTINGS_PATH,
  WELCOME_PATH
} from './app.constants';
import { AuthGuard } from './auth/auth.guard';
import { AboutComponent } from './components/pages/about/about.component';
import { HomeComponent } from './components/pages/home/home.component';
import { MapComponent } from './components/pages/map/map.component';
import { MenuComponent } from './components/pages/menu/menu.component';
import { ProfileComponent } from './components/pages/profile/profile.component';
import { RelationComponent } from './components/pages/relation/relation.component';
import { SettingsComponent } from './components/pages/settings/settings.component';
import { WelcomeComponent } from './components/pages/welcome/welcome.component';

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
    path: ABOUT_PATH,
    component: AboutComponent,
    data: { animation: 'about' },
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
