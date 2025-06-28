import {
  Component,
  Input,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// ────────────────────────────────────────────────────
// Tipi evento estratti dal piano
// ────────────────────────────────────────────────────
interface ReleaseEv { kind: 'release'; at: number; tr: string; loc: string; }
interface MoveEv    { kind: 'move';    at: number; tr: string; from: string; to: string; }
interface TrackEv   { kind: 'track';   at: number; a: string;  b: string;  status: 'open' | 'closed'; }

type Event = ReleaseEv | MoveEv | TrackEv;

const SPEED = 2;                     // fattore di rallentamento/velocità
const ORIG  = 'data-orig-status';    // attributo dove salviamo lo stato di partenza

@Component({
  selector: 'app-station-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.css'],
})
export class StationDetailComponent {
  // ────────── input ──────────
  @Input() station!: { stop_name: string; zone_id: string; stop_lat: number; stop_lon: number };
  expanded = false;
  toggleExpanded() { this.expanded = !this.expanded; }
  isExpanded()     { return this.expanded; }

  // ────────── svg reference ──────────
  @ViewChild('mapObject', { static: false }) mapObject!: ElementRef<HTMLObjectElement>;

  constructor(private http: HttpClient) {}

  // ────────── runtime ──────────
  private events: Event[] = [];
  private ready = false;

  currentIdx = 0;
  isAnimating = false;
  private rafId: number | null = null;
  private timeoutId: any = null;

  private trainImgs = new Map<string, SVGImageElement>();

  // ───────────────────────────────────────── SVG LOAD ─────────────────────────────────────────
  async onSvgLoad() {
    if (this.station.stop_name !== 'Stazione di CAGLIARI') return;

    // 1. Carica il piano una sola volta
    if (!this.events.length) {
      const raw = await firstValueFrom(this.http.get('assets/Plan.txt', { responseType: 'text' }));
      this.events = this.parseEvents(raw);
    }

    // 2. Segna lo stato originale dei binari (una sola volta)
    this.stampOriginalTrackStatus();

    // 3. Applica visibilità coerente con data-status corrente
    this.applyTrackVisibility();

    this.ready = true;
    this.resetAnimation();
  }

  // ───────────────────────────────────────── CONTROLLI UI ─────────────────────────────────────
  startAnimation() { if (this.ready && !this.isAnimating) { this.isAnimating = true; this.step(); } }
  stopAnimation()  { this.isAnimating = false; if (this.rafId) cancelAnimationFrame(this.rafId); if (this.timeoutId) clearTimeout(this.timeoutId); }

  resetAnimation() {
    this.stopAnimation();
    this.currentIdx = 0;

    // rimuove eventuali trenini
    this.trainImgs.forEach(img => img.remove());
    this.trainImgs.clear();

    // ripristina lo stato originale dei binari e aggiorna visibilità
    this.restoreOriginalTrackStatus();
    this.applyTrackVisibility();
  }

  // ───────────────────────────────────────── TRACK VISIBILITY ─────────────────────────────────
  /** Salva nello svg l'attributo data-orig-status la prima volta che il file viene caricato */
  private stampOriginalTrackStatus() {
    const svgDoc = this.mapObject?.nativeElement.contentDocument;
    if (!svgDoc) return;
    svgDoc.querySelectorAll<SVGGraphicsElement>('line[data-path]')
          .forEach(line => {
            if (!line.hasAttribute(ORIG)) {
              const st = line.getAttribute('data-status') || 'open';
              line.setAttribute(ORIG, st);
            }
          });
  }

  /** Riporta data-status al valore salvato in data-orig-status */
  private restoreOriginalTrackStatus() {
    const svgDoc = this.mapObject?.nativeElement.contentDocument;
    if (!svgDoc) return;
    svgDoc.querySelectorAll<SVGGraphicsElement>('line[data-path]')
          .forEach(line => {
            const orig = line.getAttribute(ORIG) || 'open';
            line.setAttribute('data-status', orig);
          });
  }

  /** Imposta la visibilità (opacity) in base all'attributo data-status corrente */
  private applyTrackVisibility() {
    const svgDoc = this.mapObject?.nativeElement.contentDocument;
    if (!svgDoc) return;
    svgDoc.querySelectorAll<SVGGraphicsElement>('line[data-status]')
          .forEach(l => {
            const st = l.getAttribute('data-status');
            l.style.opacity = st === 'closed' ? '0' : '1';
          });
  }

  // ───────────────────────────────────────── PARSER ───────────────────────────────────────────
  private parseEvents(txt: string): Event[] {
    const evs: Event[] = [];

    const move = /([\d.]+)\s*:\s*\(move\s+([^\s]+)\s+([^\s]+)\s+([^\s)]+)\)/gi;
    for (const m of txt.matchAll(move))   evs.push({ kind:'move',    at:+m[1], tr:m[2], from:m[3], to:m[4] });

    const rel  = /([\d.]+)\s*:\s*\(release\s+([^\s]+)\s+([^\s)]+)\)/gi;
    for (const m of txt.matchAll(rel))    evs.push({ kind:'release', at:+m[1], tr:m[2], loc:m[3] });

    const trk  = /([\d.]+)\s*:\s*\((open|close)-track\s+([^\s]+)\s+([^\s)]+)\)/gi;
    for (const m of txt.matchAll(trk))    evs.push({ kind:'track',   at:+m[1], a:m[3], b:m[4], status:m[2]==='open'?'open':'closed' });

    return evs.sort((a,b)=>a.at-b.at);
  }

  // ───────────────────────────────────────── UTIL ─────────────────────────────────────────────
  private center(root: SVGSVGElement, el: SVGGraphicsElement) {
    const r = el.getBoundingClientRect();
    const p = root.createSVGPoint(); p.x=r.left+r.width/2; p.y=r.top+r.height/2;
    return p.matrixTransform(root.getScreenCTM()!.inverse());
  }

  private getTrain(svgDoc: Document, tr: string) {
    const cached = this.trainImgs.get(tr);
    if (cached) return cached;
    const img = svgDoc.createElementNS('http://www.w3.org/2000/svg','image');
    img.setAttributeNS('http://www.w3.org/1999/xlink','href','train_icon.png');
    img.setAttribute('width','24'); img.setAttribute('height','24'); img.style.pointerEvents='none';
    svgDoc.querySelector('svg')!.appendChild(img);
    this.trainImgs.set(tr,img);
    return img;
  }

  // ───────────────────────────────────────── TIMELINE ─────────────────────────────────────────
  private step() {
    if (!this.isAnimating) return;

    const ev      = this.events[this.currentIdx];
    const nextIdx = (this.currentIdx+1)%this.events.length;
    const nextAt  = this.events[nextIdx].at>ev.at ? this.events[nextIdx].at : ev.at+1;
    const durMs   = (nextAt-ev.at)*1000*SPEED;

    const svgDoc  = this.mapObject.nativeElement.contentDocument!;
    const svgRoot = svgDoc.querySelector('svg') as SVGSVGElement;

    switch(ev.kind){
      /* ---- release ------------------------------------------------ */
      case 'release': {
        const img = this.getTrain(svgDoc,ev.tr);
        const loc = svgDoc.getElementById(ev.loc) as SVGGraphicsElement|null;
        if (loc){ const p=this.center(svgRoot,loc); img.setAttribute('x',String(p.x-12)); img.setAttribute('y',String(p.y-12)); }
        this.schedule(nextIdx,0); break; }

      /* ---- track open/close -------------------------------------- */
      case 'track': {
        [`${ev.a},${ev.b}`,`${ev.b},${ev.a}`].forEach(path=>{
          const line = svgDoc.querySelector<SVGGraphicsElement>(`line[data-path="${path}"]`);
          if (line){
            line.style.transition='opacity 300ms linear';
            line.setAttribute('data-status',ev.status);
            line.style.opacity = ev.status==='open'?'1':'0';
          }
        });
        this.schedule(nextIdx,0); break; }

      /* ---- move --------------------------------------------------- */
      case 'move': {
        const img = this.getTrain(svgDoc,ev.tr);
        const from = svgDoc.getElementById(ev.from) as SVGGraphicsElement|null;
        const to   = svgDoc.getElementById(ev.to)   as SVGGraphicsElement|null;
        if (!(from&&to)){ this.schedule(nextIdx,0); break; }
        const p0=this.center(svgRoot,from); const p1=this.center(svgRoot,to);
        const t0=performance.now();
        const tick=(now:number)=>{
          if(!this.isAnimating) return;
          const k=Math.min((now-t0)/durMs,1);
          img.setAttribute('x',String(p0.x+k*(p1.x-p0.x)-12));
          img.setAttribute('y',String(p0.y+k*(p1.y-p0.y)-12));
          if(k<1) this.rafId=requestAnimationFrame(tick); else this.schedule(nextIdx,0);
        };
        this.rafId=requestAnimationFrame(tick);
        break; }
    }
  }

  private schedule(idx:number,delayMs:number){
    this.currentIdx=idx;
    if(!this.isAnimating) return;
    this.timeoutId=setTimeout(()=>this.step(),delayMs);
  }
}
