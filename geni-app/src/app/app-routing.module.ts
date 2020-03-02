import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { homePath, welcomePath, welcomeUrl } from './app.constants';
import { AuthGuard } from './auth/auth.guard';
import { HomeComponent } from './components/containers/home/home.component';
import { WelcomeComponent } from './components/containers/welcome/welcome.component';

const routes: Routes = [
  { path: homePath, component: HomeComponent, canActivate: [AuthGuard] },
  { path: welcomePath, component: WelcomeComponent },
  { path: '**', redirectTo: welcomeUrl },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
