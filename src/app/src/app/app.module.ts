import {
  HttpClient,
  HttpClientJsonpModule,
  HttpClientModule,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { NgModule, Provider } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { NgChatModule } from 'ng-chat';
import { SocketIoModule } from 'ngx-socket-io';
import { environment as env } from 'src/environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './auth/auth.interceptor';
import { AboutComponent } from './components/pages/about/about.component';
import { HomeComponent } from './components/pages/home/home.component';
import { RelationCardComponent } from './components/pages/home/relations-list/relation-card/relation-card.component';
import { RelationsListComponent } from './components/pages/home/relations-list/relations-list.component';
import { MapComponent } from './components/pages/map/map.component';
import { MenuComponent } from './components/pages/menu/menu.component';
import { ProfileComponent } from './components/pages/profile/profile.component';
import { RelationComponent } from './components/pages/relation/relation.component';
import { SettingsComponent } from './components/pages/settings/settings.component';
import { SortComponent } from './components/pages/settings/sort/sort.component';
import { WelcomeComponent } from './components/pages/welcome/welcome.component';
import { ConnectionComponent } from './components/parts/connection/connection.component';
import { ConnectionsListComponent } from './components/parts/connections-list/connections-list.component';
import { GenderDotComponent } from './components/parts/connections-list/gender-dot/gender-dot.component';
import { InfoBarComponent } from './components/parts/info-bar/info-bar.component';
import { MapPinComponent } from './components/parts/map-pin/map-pin.component';
import { P2pButtonComponent } from './components/parts/p2p-button/p2p-button.component';
import { P2pChatComponent } from './components/parts/p2p-chat/p2p-chat.component';
import { PredefinedMessagesComponent } from './components/parts/p2p-chat/predefined-messages/predefined-messages.component';
import { P2pModalComponent } from './components/parts/p2p-modal/p2p-modal.component';
import { P2pMessageModalComponent } from './components/parts/p2p-message-modal/p2p-message-modal.component';
import { ProfileDetailsComponent } from './components/parts/profile-details/profile-details.component';
import { RelativesInfoModalComponent } from './components/parts/relatives-info-modal/relatives-info-modal.component';
import { SpinnerComponent } from './components/parts/spinner/spinner.component';
import { TitleBarComponent } from './components/parts/title-bar/title-bar.component';
import { ToolbarComponent } from './components/parts/toolbar/toolbar.component';
import { ModalRefDirective } from './directives/modal-ref.directive';
import { RelationsSortByPipe } from './pipes/relations-sort-by.pipe';
import { SearchComponent } from './components/pages/settings/search/search.component';
import { FiltersComponent } from './components/pages/settings/filters/filters.component';
import { AccordionModule } from 'ngx-bootstrap/accordion';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { NgxPaginationModule } from 'ngx-pagination';
import { SearchPipePipe } from './pipes/search-pipe.pipe';

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
 */
@NgModule({
  providers: [INTERCEPTOR_PROVIDER],
  declarations: [],
  imports: [NgbModule],
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
    SearchComponent,
    FiltersComponent,
    RelativesInfoModalComponent,
    ModalRefDirective,
    MapPinComponent,
    MapComponent,
    AboutComponent,
    P2pModalComponent,
    ProfileDetailsComponent,
    P2pButtonComponent,
    P2pChatComponent,
    PredefinedMessagesComponent,
    P2pMessageModalComponent,
    SearchPipePipe
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AccordionModule.forRoot(),
    FilterPipeModule,
    AppRoutingModule,
    HttpClientModule,
    JsonpInterceptorModule, // Must be before the HttpClientJsonpModule to use interceptor
    HttpClientJsonpModule,
    FontAwesomeModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient],
      },
    }),
    NgxPaginationModule,
    // TODO don't hardcode socket url
    SocketIoModule.forRoot({
      url: env.socketioUrl,
      options: {},
    }),
    NgChatModule,
  ],
  providers: [INTERCEPTOR_PROVIDER],
  bootstrap: [AppComponent],
})
export class AppModule {}
