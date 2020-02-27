import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { homePath } from './app.constants';
import { WelcomeComponent } from './components/containers/welcome/welcome.component';

const routes: Routes = [{ path: homePath, component: WelcomeComponent }];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
