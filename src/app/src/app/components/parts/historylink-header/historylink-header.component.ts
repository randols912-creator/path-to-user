import { Component } from '@angular/core';

/**
 * Shared "HistoryLink" top bar so Path-to-User matches the other HistoryLink
 * research tools. Links break out to the full window (target="_top") so it
 * works whether the app is standalone or embedded.
 */
@Component({
  selector: 'app-historylink-header',
  template: `
    <header class="hl-header">
      <a class="hl-logo" href="https://historylink.herokuapp.com/" target="_top">
        History<span>Link</span>
      </a>
      <nav class="hl-nav">
        <a href="https://historylink.herokuapp.com/history" target="_top">
          History Search<small>Investigate your history</small></a>
        <a href="https://historylink.herokuapp.com/graph" target="_top">
          Ancestor Graph<small>Visualize your ancestry</small></a>
        <a href="https://gfdc-847976dd14c0.herokuapp.com/" target="_top">
          Density Calculator<small>Measure forest density</small></a>
        <a class="hl-current" href="/" target="_top">
          Path to User<small>Find a path to a profile</small></a>
      </nav>
    </header>
  `,
  styles: [`
    .hl-header{
      display:flex; align-items:center; flex-wrap:wrap; gap:4px 18px;
      background:#f7f7f5; border-bottom:2px solid #d9d9d3;
      padding:8px 16px; font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;
    }
    .hl-logo{
      font-size:22px; font-weight:700; color:#4a4a4a; text-decoration:none;
      letter-spacing:.5px; white-space:nowrap; margin-right:8px;
    }
    .hl-logo span{ color:#2c6bed; }
    .hl-nav{ display:flex; flex-wrap:wrap; gap:2px 20px; margin-left:auto; }
    .hl-nav a{
      display:flex; flex-direction:column; line-height:1.15;
      color:#333; text-decoration:none; font-weight:600; font-size:14px;
      padding:2px 0;
    }
    .hl-nav a small{ color:#888; font-weight:400; font-size:11px; }
    .hl-nav a:hover{ color:#2c6bed; }
    .hl-nav a.hl-current{ color:#2c6bed; border-bottom:2px solid #2c6bed; }
    @media (max-width:640px){
      .hl-header{ padding:6px 10px; gap:2px 12px; }
      .hl-logo{ font-size:18px; }
      .hl-nav{ gap:2px 12px; width:100%; margin-left:0; }
      .hl-nav a{ font-size:12px; }
      .hl-nav a small{ display:none; }
    }
  `]
})
export class HistorylinkHeaderComponent {}
