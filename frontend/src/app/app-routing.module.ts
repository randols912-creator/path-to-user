import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './shared/auth/auth.guard';
import { HomePageComponent } from './shared/components/home-page/home-page.component';
import { WelcomePageComponent } from './shared/components/welcome-page/welcome-page.component';
import consts from './shared/constants';

const routes: Routes = [
  { path: '', component: HomePageComponent, canActivate: [AuthGuard] },
  { path: 'welcome', component: WelcomePageComponent },
  { path: '**', redirectTo: consts.welcomeURL },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
