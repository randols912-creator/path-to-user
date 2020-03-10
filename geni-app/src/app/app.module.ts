import {
  HttpClientJsonpModule,
  HttpClientModule,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { NgModule, Provider } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthInterceptor } from './auth/auth.interceptor';
import { HomeComponent } from './components/containers/home/home.component';
import { MenuComponent } from './components/containers/menu/menu.component';
import { WelcomeComponent } from './components/containers/welcome/welcome.component';
import { TitleBarComponent } from './components/ui/title-bar/title-bar.component';
import { ToolbarComponent } from './components/ui/toolbar/toolbar.component';

const INTERCEPTOR_PROVIDER: Provider = {
  provide: HTTP_INTERCEPTORS,
  useClass: AuthInterceptor,
  multi: true,
};

@NgModule({
  providers: [INTERCEPTOR_PROVIDER],
  declarations: [],
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
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    JsonpInterceptorModule, // Must be before the HttpClientJsonpModule to use interceptor
    HttpClientJsonpModule,
  ],
  providers: [INTERCEPTOR_PROVIDER],
  bootstrap: [AppComponent],
})
export class AppModule {}
