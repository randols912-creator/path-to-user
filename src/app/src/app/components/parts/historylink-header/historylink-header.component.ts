import { Component } from '@angular/core';

/**
 * Shared "HistoryLink" top bar so Path-to-User matches the other HistoryLink
 * research tools (styled to match the GFDC / HistoryLink header: logo image,
 * light gray-blue band, dark top rule, two-line nav links). Links break out
 * to the full window (target="_top") so it works whether the app is
 * standalone or embedded.
 */
@Component({
  selector: 'app-historylink-header',
  template: `
    <header class="hl-header">
      <div class="hl-container">
        <h1 class="hl-logo">
          <a href="https://historylink.herokuapp.com/" title="HistoryLink" target="_top">
            <img src="assets/img/HistoryLink6.png" alt="HistoryLink" class="hl-logo-full" />
            <img src="assets/img/HistoryLink5sm.png" alt="HistoryLink" class="hl-logo-small" />
          </a>
        </h1>
        <nav class="hl-nav">
          <ul>
            <li><a href="https://historylink.herokuapp.com/history" target="_top">
              History Search<br /><span>Investigate your History</span></a></li>
            <li><a href="https://historylink.herokuapp.com/graph" target="_top">
              Ancestor Graph<br /><span>Visualize your Ancestry</span></a></li>
            <li><a href="https://gfdc-847976dd14c0.herokuapp.com/" target="_top">
              Density Calculator<br /><span>Calculate Forest Density</span></a></li>
            <li><a href="/" target="_top">
              Path to User<br /><span>Find a Path to a Profile</span></a></li>
          </ul>
        </nav>
      </div>
      <div class="hl-bottom-gradient"></div>
    </header>
  `,
  styles: [`
    .hl-header{
      display:block;
      border-top:6px solid #4a4a4a;
      background:#E5EBF0;
      font:13px/18px 'Open Sans','OpenSansHebrew','HelveticaNeue','Helvetica Neue',Helvetica,Arial,sans-serif;
    }
    .hl-header h1{ margin:0; padding:0; border:0; font-size:inherit; font-weight:normal; }
    .hl-header ul{ margin:0; padding:0; list-style:none; }
    .hl-container{
      position:relative; max-width:990px; margin:0 auto;
      display:flex; align-items:flex-end; justify-content:space-between;
      flex-wrap:wrap;
    }
    .hl-logo a{ display:block; max-height:80px; }
    .hl-logo img{ display:block; border:0; height:auto; }
    .hl-logo img.hl-logo-full{ padding:5px 0 4px 30px; }
    .hl-logo img.hl-logo-small{ display:none; padding:8px 0 6px 10px; }
    .hl-nav ul{ display:flex; }
    .hl-nav a, .hl-nav a:visited, .hl-nav a:focus{
      display:block; height:63px; box-sizing:border-box;
      padding:14px 9px 0 9px; margin-top:1px;
      text-decoration:none; color:#333; font-weight:600; font-size:13px;
      line-height:18px;
      border-top:3px solid #4a4a4a;
      text-shadow:0 1px 0 rgba(255,255,255,0.8);
    }
    .hl-nav a:hover{ color:#000; border-top-color:#c1c1c1; text-decoration:none; }
    .hl-nav a span{ color:#888; font-size:12px; font-weight:normal; }
    .hl-bottom-gradient{
      height:0; border-top:1px solid #DDD; border-bottom:1px solid #fff;
      clear:both; margin:0;
    }
    @media (max-width:959px){
      .hl-nav a, .hl-nav a:visited, .hl-nav a:focus{
        height:40px; padding:12px 10px 0 10px;
      }
      .hl-nav a span{ display:none; }
      .hl-logo img.hl-logo-full{ max-height:60px; width:auto; }
    }
    @media (max-width:767px){
      .hl-logo img.hl-logo-full{ display:none; }
      .hl-logo img.hl-logo-small{ display:block; }
      .hl-nav a, .hl-nav a:visited, .hl-nav a:focus{ padding:12px 6px 0 6px; font-size:12px; }
    }
  `]
})
export class HistorylinkHeaderComponent {}
