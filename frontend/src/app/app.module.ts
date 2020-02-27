import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule, Provider } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MaterialModule } from './material/material.module';
import { AuthInterceptor } from './shared/auth/auth.interceptor';
import { HomePageComponent } from './shared/components/home-page/home-page.component';
import { NavComponent } from './shared/components/nav/nav.component';
import { ProfileRelationsComponent } from './shared/components/profile-relations/profile-relations.component';
import { RelationDetailsComponent } from './shared/components/relation-details/relation-details.component';
import { RelationsComponent } from './shared/components/relations/relations.component';
import { WelcomePageComponent } from './shared/components/welcome-page/welcome-page.component';

const INTERCEPTOR_PROVIDER: Provider = {
  provide: HTTP_INTERCEPTORS,
  useClass: AuthInterceptor,
  multi: true,
};

@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    HomePageComponent,
    WelcomePageComponent,
    RelationsComponent,
    RelationDetailsComponent,
    ProfileRelationsComponent,
  ],
  entryComponents: [RelationDetailsComponent, ProfileRelationsComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MaterialModule,
    AppRoutingModule,
    HttpClientModule,
  ],
  providers: [INTERCEPTOR_PROVIDER],
  bootstrap: [AppComponent],
})
export class AppModule {}
