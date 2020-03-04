import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { homePath, menuPath, welcomePath, welcomeUrl } from './app.constants';
import { AuthGuard } from './auth/auth.guard';
import { HomeComponent } from './components/containers/home/home.component';
import { MenuComponent } from './components/containers/menu/menu.component';
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
    canActivate: [AuthGuard],
    data: { animation: 'menu' },
  },
  { path: welcomePath, component: WelcomeComponent },
  { path: '**', redirectTo: welcomeUrl },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
