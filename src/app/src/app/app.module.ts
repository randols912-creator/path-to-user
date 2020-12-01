import {
  HttpClient,
  HttpClientJsonpModule,
  HttpClientModule,
  HTTP_INTERCEPTORS
} from '@angular/common/http';
import { NgModule, Provider } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './auth/auth.interceptor';
import { HomeComponent } from './components/containers/home/home.component';
import { RelationCardComponent } from './components/containers/home/relations-list/relation-card/relation-card.component';
import { RelationsListComponent } from './components/containers/home/relations-list/relations-list.component';
import { MapComponent } from './components/containers/map/map.component';
import { MenuComponent } from './components/containers/menu/menu.component';
import { ProfileComponent } from './components/containers/profile/profile.component';
import { ConnectionComponent } from './components/containers/relation/connections-list/connection/connection.component';
import { ConnectionsListComponent } from './components/containers/relation/connections-list/connections-list.component';
import { GenderDotComponent } from './components/containers/relation/connections-list/gender-dot/gender-dot.component';
import { RelationComponent } from './components/containers/relation/relation.component';
import { SettingsComponent } from './components/containers/settings/settings.component';
import { SortComponent } from './components/containers/settings/sort/sort.component';
import { WelcomeComponent } from './components/containers/welcome/welcome.component';
import { InfoBarComponent } from './components/ui/info-bar/info-bar.component';
import { MapPinComponent } from './components/ui/map-pin/map-pin.component';
import { ModalComponent } from './components/ui/modal/modal.component';
import { SpinnerComponent } from './components/ui/spinner/spinner.component';
import { TitleBarComponent } from './components/ui/title-bar/title-bar.component';
import { ToolbarComponent } from './components/ui/toolbar/toolbar.component';
import { RefDirective } from './directives/ref.directive';
import { RelationsSortByPipe } from './pipes/relations-sort-by.pipe';

const INTERCEPTOR_PROVIDER: Provider = {
  provide: HTTP_INTERCEPTORS,
  useClass: AuthInterceptor,
  multi: true,
};

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}

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
    SpinnerComponent,
    RelationsSortByPipe,
    SettingsComponent,
    SortComponent,
    ModalComponent,
    RefDirective,
    MapPinComponent,
    MapComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    JsonpInterceptorModule, // Must be before the HttpClientJsonpModule to use interceptor
    HttpClientJsonpModule,
    FontAwesomeModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
  ],
  providers: [INTERCEPTOR_PROVIDER],
  bootstrap: [AppComponent],
})
export class AppModule {}
