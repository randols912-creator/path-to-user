import { Component, Input, NgZone, OnInit, ViewChild, ViewEncapsulation, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { SettingsService } from 'src/app/services/settings.service';
import { RelationService } from 'src/app/services/relation.service';
import { AuthService } from 'src/app/auth/auth.service';
import { HOME_PATH } from 'src/app/app.constants';
import { environment as env } from 'src/environments/environment';


@Component({
  selector: 'app-profile-popup',
  templateUrl: './profile-popup.component.html',
  styleUrls: ['./profile-popup.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class ProfilePopupComponent implements OnInit {
  @ViewChild('accordion') accordion;
  @ViewChild("filterOption0") myNameElem: ElementRef;


  profileForm: FormGroup;
  oneAtATime = true;
  openFirst=true;
  ischeckedradio: boolean = false;
  sourceLabels = ['My Profile', 'Another Profile'];
  targetLabels = ['Profile', 'Project'];
  targetType = 'profile';
  profilePrefix = 'profile-g';

  // Fallback list used only if the presets service is unreachable.
  projectList: any[] = [
    {label: "Nobel Prize in Physics", id: "10373"},
    {label: "Nobel Prize in Literature", id: "5272"},
    {label: "Nobel Prize in Chemistry", id: "5571"},
    {label: "Nobel Peace Prize", id: "8020"},
    {label: "Nobel Prize in Physiology or Medicine", id: "7284"},
    {label: "Nobel Prize in Economics", id: "10374"},
    {label: "Mayflower Passengers of 1620", id: "8"},
    {label: "British Monarchs", id: "3232"},
    {label: "Partial Hollywood Walk of Fame", id: "358"},
    {label: "US Presidents and Vice Presidents", id: "9"},
    {label: "Titanic Passengers - First Class", id: "10700"},
    {label: "Titanic Passengers - Second Class", id: "10701"},
    {label: "Titanic Passengers - Third Class", id: "10702"},
    {label: "Titanic Deck Crew", id: "10704"}
  ];
  customSourceProfileId = "";
  customTargetProfileId = "";
  customTargetProjectId = "";
  selectedItemsList = [];
  checkboxvalue: any;

  // ---- profile name search state ('source' and 'target' are independent) ----
  search = {
    source: { query: '', results: [], busy: false, message: '', selectedName: '' },
    target: { query: '', results: [], busy: false, message: '', selectedName: '' },
    project: { query: '', results: [], busy: false, message: '', selectedName: '' }
  };

  cseVisible = false;
  private cseLoaded = false;
  private cseSeq = 0;

  constructor(private settingsService: SettingsService,
              private relationsService: RelationService,
              private authService: AuthService,
              private http: HttpClient,
              private zone: NgZone,
              private router: Router) { }

  ngOnInit(): void {
    this.profileForm = new FormGroup({
      sourceProfile: new FormControl(),
      targetType: new FormControl(),
      targetProjectIdSelection: new FormControl()
    });

    // Load the editable preset list from the server (falls back to the
    // built-in list above if the request fails).
    this.http.get<any>(`${env.relationsServiceHost}/api/v1/projects/presets`)
      .subscribe(data => {
        if (data && data.presets && data.presets.length) {
          this.projectList = data.presets.map(p => ({
            label: p.label,
            id: String(p.id).replace('project-', '')
          }));
          this.restoreProjectSelection();
        }
      }, () => { /* keep fallback list */ });

    let initialFormValues = {
      sourceProfile: 0
    };

    let srcTgt = this.settingsService.getSourceTarget();

    if(srcTgt.sourceId) {
      this.customSourceProfileId = srcTgt.sourceId.replace(this.profilePrefix, '');
      initialFormValues['sourceProfile'] = 1;
    }

    if (srcTgt.targetId) {
      if (srcTgt.targetId.startsWith('profile')) {
        this.customTargetProfileId = srcTgt.targetId.replace(this.profilePrefix, '');
        initialFormValues['targetType'] = 0;
      } else {
        this.customTargetProjectId = srcTgt.targetId.replace("project-", '');
        initialFormValues['targetType'] = 1;
      }
    }
    this.profileForm.patchValue(initialFormValues);
    this.onchangeTarget();
    this.restoreProjectSelection();
  }

  private restoreProjectSelection() {
    for (let i = 0; i < this.projectList.length; i++) {
      this.projectList[i].checked = (this.customTargetProjectId == this.projectList[i].id);
    }
  }

  onchange() {
    if (this.profileForm.value.sourceProfile == 0 || this.profileForm.value.sourceProfile == 1) {
      this.ischeckedradio = true;
    } else {
      this.ischeckedradio = false;
    }
  }

  onchangeTarget() {
    this.targetType = this.profileForm.value.targetType == 1 ? "project" : "profile";
    for (let i = 0; i < this.projectList.length; i++) {
      this.projectList[i].checked = false;
    }
  }

  clear() {
    this.profileForm.value.sourceProfile = '';
    this.ischeckedradio = false;
  }

  onProjectSelection() {
    this.customTargetProjectId = this.profileForm.value.targetProjectIdSelection
    for (let i = 0; i < this.projectList.length; i++) {
      this.projectList[i].checked = (this.customTargetProjectId == this.projectList[i].id);
    }
  }

  // ---------------- profile search by name (Geni profile/search) ----------------

  searchProfiles(which) {
    const box = this.search[which];
    const q = (box.query || '').trim();
    if (!q || box.busy) { return; }
    const token = this.authService.token;
    if (!token) {
      box.message = 'Please log in again to search.';
      return;
    }
    box.busy = true;
    box.message = '';
    box.results = [];
    this.http.get<any>(`${env.relationsServiceHost}/api/v1/profiles/search`, {
      params: { names: q }
    }).subscribe(data => {
      box.busy = false;
      const results = (data && data.results) || [];
      box.results = results
        .filter(r => r && r.guid)
        .slice(0, 12)
        .map(r => ({ guid: String(r.guid), name: r.name || ('profile ' + r.guid) }));
      if (!box.results.length) {
        box.message = 'No profiles found - try another spelling.';
      }
    }, () => {
      box.busy = false;
      box.message = 'Search failed - please try again.';
    });
  }

  selectSearchResult(which, r) {
    const box = this.search[which];
    box.selectedName = r.name;
    box.results = [];
    box.message = '';
    if (which === 'source') {
      this.customSourceProfileId = r.guid;
    } else {
      this.customTargetProfileId = r.guid;
    }
  }

  searchKeydown(event, which) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.searchProfiles(which);
    }
  }

  // ---------------- project search by name (Google-backed) ----------------

  searchProjectsByName() {
    const box = this.search.project;
    const q = (box.query || '').trim();
    if (!q || box.busy) { return; }
    box.busy = true;
    box.message = '';
    box.results = [];
    this.cseVisible = false;
    this.http.get<any>(`${env.relationsServiceHost}/api/v1/projects/search`, {
      params: { q: q }
    }).subscribe(data => {
      box.busy = false;
      const results = ((data && data.results) || []).slice(0, 10);
      if (results.length) {
        box.results = results;
        return;
      }
      if (data && data.cse_id) {
        this.showCseWidget(data.cse_id, q);
        return;
      }
      box.message = data && data.configured === false
        ? 'Project search is not available right now - enter a project id below.'
        : 'No projects found - try another spelling.';
    }, () => {
      box.busy = false;
      box.message = 'Search failed - please try again.';
    });
  }

  // Google Programmable Search widget fallback: render Google's own results
  // inline and intercept clicks so choosing a project stays in the app.
  // NOTE: the Google engine must be set to "Results only" layout in the
  // control panel; in "Overlay" mode the results float in a layer we can't
  // manage. We render a FRESH element into a fresh holder on every search so
  // there is never stale widget state to fight (which broke repeat searches).
  private showCseWidget(cseId, q) {
    const w: any = window as any;
    const box = this.search.project;
    this.cseVisible = true;
    const renderFresh = () => {
      const g = w.google;
      const wrap = document.getElementById('p2uGcseWrap');
      if (!wrap) { setTimeout(renderFresh, 200); return; }
      if (!(g && g.search && g.search.cse && g.search.cse.element)) {
        setTimeout(renderFresh, 250);
        return;
      }
      const seq = ++this.cseSeq;
      const holderId = 'p2uGcseHolder' + seq;
      const gname = 'p2uapp' + seq;
      wrap.innerHTML = '';
      const holder = document.createElement('div');
      holder.id = holderId;
      wrap.appendChild(holder);
      holder.addEventListener('click', (ev: any) => {
        const a = ev.target && ev.target.closest ? ev.target.closest('a') : null;
        if (!a) { return; }
        const url = a.getAttribute('data-ctorig') || a.href || '';
        const m = url.match(/geni\.com\/projects\/[^\/]+\/(\d+)/);
        if (!m) { return; }
        ev.preventDefault();
        ev.stopPropagation();
        const title = (a.textContent || ('project-' + m[1]))
          .replace(/\s*[-|]\s*geni(\.com)?.*$/i, '').trim();
        this.zone.run(() => {
          this.selectProjectResult({ project_id: 'project-' + m[1], title: title });
        });
      }, true);
      g.search.cse.element.render({ div: holderId, tag: 'searchresults-only', gname: gname,
        attributes: { overlayResults: false, enableHistory: false, linkTarget: '_self' } });
      const el = g.search.cse.element.getElement(gname);
      if (el) { el.execute(q); }
    };
    if (!this.cseLoaded) {
      w.__gcse = { parsetags: 'explicit', callback: () => { this.cseLoaded = true; } };
      const s = document.createElement('script');
      s.src = 'https://cse.google.com/cse.js?cx=' + encodeURIComponent(cseId);
      s.async = true;
      s.onload = () => { setTimeout(renderFresh, 300); };
      s.onerror = () => {
        this.zone.run(() => {
          this.cseVisible = false;
          box.message = 'Project search is not available right now - enter a project id below.';
        });
      };
      document.head.appendChild(s);
    } else {
      renderFresh();
    }
  }

  hideCseWidget() {
    this.cseVisible = false;
    const wrap = document.getElementById('p2uGcseWrap');
    if (wrap) { wrap.innerHTML = ''; }
  }

  selectProjectResult(r) {
    const box = this.search.project;
    box.selectedName = r.title;
    box.results = [];
    box.message = '';
    this.hideCseWidget();
    this.customTargetProjectId = String(r.project_id).replace('project-', '');
    this.profileForm.patchValue({ targetProjectIdSelection: null });
    this.restoreProjectSelection();
  }

  projectSearchKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.searchProjectsByName();
    }
  }

  isValid() {
    let hasSourceId = this.profileForm.value.sourceProfile == 0 ||
                        this.profileForm.value.sourceProfile &&  this.customSourceProfileId;
    let hasTargetId = this.targetType == "profile" ? this.customTargetProfileId : this.customTargetProjectId;

    return hasSourceId && hasTargetId;

  }

  onSubmit() {
    let sourceId = this.profileForm.value.sourceProfile  ? this.profilePrefix + this.customSourceProfileId : '';
    let targetId = this.targetType + "-" + (this.targetType == "profile" ? "g" + this.customTargetProfileId : this.customTargetProjectId);

    // Carry the name we already know from selection so the results page can show
    // it instantly and never depends on a (sometimes rate-limited) name lookup.
    let targetName = this.targetName();
    this.settingsService.setSourceTarget(sourceId, targetId, targetName);
    this.relationsService.reset();
    this.router.navigate([`/${HOME_PATH}`]);


  }

  // Best-effort display name for the chosen target, from data already in hand.
  private targetName(): string {
    if (this.targetType === 'profile') {
      return this.search.target.selectedName || '';
    }
    // project: prefer an explicit search selection, else the matching preset label
    if (this.search.project.selectedName) { return this.search.project.selectedName; }
    const hit = this.projectList.find(p => p.id == this.customTargetProjectId);
    return hit ? hit.label : '';
  }

}
