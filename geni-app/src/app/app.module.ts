import {
  HttpClientJsonpModule,
  HttpClientModule,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { NgModule, Provider } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './auth/auth.interceptor';
import { HomeComponent } from './components/containers/home/home.component';
import { RelationCardComponent } from './components/containers/home/relations-list/relation-card/relation-card.component';
import { RelationsListComponent } from './components/containers/home/relations-list/relations-list.component';
import { MenuComponent } from './components/containers/menu/menu.component';
import { ProfileComponent } from './components/containers/profile/profile.component';
import { ReadMoreFooterComponent } from './components/containers/profile/read-more-footer/read-more-footer.component';
import { ConnectionComponent } from './components/containers/relation/connections-list/connection/connection.component';
import { ConnectionsListComponent } from './components/containers/relation/connections-list/connections-list.component';
import { GenderDotComponent } from './components/containers/relation/connections-list/gender-dot/gender-dot.component';
import { RelationComponent } from './components/containers/relation/relation.component';
import { WelcomeBottomComponent } from './components/containers/welcome/welcome-bottom/welcome-bottom.component';
import { WelcomeMiddleComponent } from './components/containers/welcome/welcome-middle/welcome-middle.component';
import { WelcomeTopComponent } from './components/containers/welcome/welcome-top/welcome-top.component';
import { WelcomeComponent } from './components/containers/welcome/welcome.component';
import { InfoBarComponent } from './components/ui/info-bar/info-bar.component';
import { SpinnerComponent } from './components/ui/spinner/spinner.component';
import { TitleBarComponent } from './components/ui/title-bar/title-bar.component';
import { ToolbarComponent } from './components/ui/toolbar/toolbar.component';

const INTERCEPTOR_PROVIDER: Provider = {
  provide: HTTP_INTERCEPTORS,
  useClass: AuthInterceptor,
  multi: true,
};

/**
 * Hack to alow JSONP requests to use existing interceptors
 */ @NgModule({
  providers: [INTERCEPTOR_PROVIDER],
  declarations: [],
  imports: [],
})
class JsonpInterceptorModule {}

@NgModule({
  declarations: [
    AppComponent,
    WelcomeComponent,
    WelcomeTopComponent,
    WelcomeMiddleComponent,
    WelcomeBottomComponent,
    HomeComponent,
    TitleBarComponent,
    ToolbarComponent,
    MenuComponent,
    RelationsListComponent,
    RelationCardComponent,
    RelationComponent,
    InfoBarComponent,
    ConnectionsListComponent,
    ConnectionComponent,
    GenderDotComponent,
    ProfileComponent,
    ReadMoreFooterComponent,
    SpinnerComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    JsonpInterceptorModule, // Must be before the HttpClientJsonpModule to use interceptor
    HttpClientJsonpModule,
    FontAwesomeModule,
  ],
  providers: [INTERCEPTOR_PROVIDER],
  bootstrap: [AppComponent],
})
export class AppModule {}
