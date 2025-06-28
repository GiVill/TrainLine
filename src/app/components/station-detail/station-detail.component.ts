import {
  Component,
  Input,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/* ---------- eventi ---------- */
type MoveEv  = { kind: 'move';  at: number; from: string; to: string };
type TrackEv = { kind: 'track'; at: number; a: string;   b: string; status: 'open' | 'closed' };
type Event   = MoveEv | TrackEv;

/* ---------- fattore velocità ---------- */
const SPEED = 2;                // 1 = tempo reale; >1 = rallenta; <1 = accelera

/* ====================================================== */
@Component({
  selector: 'app-station-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.css'],
})
export class StationDetailComponent {

  /* ------------ input ------------ */
  @Input() station!: { stop_name: string; zone_id: string; stop_lat: number; stop_lon: number };

  /* ------------ collapse ---------- */
  expanded = false;
  toggleExpanded() { this.expanded = !this.expanded; }
  isExpanded()      { return this.expanded; }

  /* ------------ <object> ---------- */
  @ViewChild('mapObject', { static: false }) mapObject!: ElementRef<HTMLObjectElement>;

  /* ------------ controlli animazione ---------- */
  isAnimating = false;
  private currentTimeoutId: number | null = null;
  private currentAnimationId: number | null = null;

  /* ------------ stato per riprendere animazione ---------- */
  currentEventIndex = 0;
  currentEventProgress = 0; // progresso nell'evento corrente (0-1)
  private pausedAt = 0; // timestamp quando è stata messa in pausa

  constructor(private http: HttpClient) {}

  private events: Event[] = [];

  /* ======================================================
     Controlli pubblici per start/stop animazione
     ==================================================== */
  startAnimation() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    if (this.mapObject && this.events.length > 0) {
      const svgDoc = this.mapObject.nativeElement.contentDocument!;
      const svgRoot = svgDoc.querySelector('svg') as SVGSVGElement | null;
      const train = svgDoc.getElementById('movingTrain') as SVGImageElement | null;
      
      if (svgRoot && train) {
        // Riprendi dall'indice e progresso correnti
        this.runTimelineFromCurrent(svgDoc, svgRoot, train, this.events);
      }
    }
  }

  stopAnimation() {
    if (!this.isAnimating) return;
    
    this.isAnimating = false;
    this.pausedAt = performance.now();
    
    // Cancella timeout e animazioni in corso
    if (this.currentTimeoutId !== null) {
      clearTimeout(this.currentTimeoutId);
      this.currentTimeoutId = null;
    }
    
    if (this.currentAnimationId !== null) {
      cancelAnimationFrame(this.currentAnimationId);
      this.currentAnimationId = null;
    }
  }

  /* ======================================================
     Reset animazione (nuovo metodo per ricominciare da capo)
     ==================================================== */
  resetAnimation() {
    this.stopAnimation();
    this.currentEventIndex = 0;
    this.currentEventProgress = 0;
    this.pausedAt = 0;
    
    // Riposiziona il treno alla posizione iniziale
    if (this.mapObject && this.events.length > 0) {
      const svgDoc = this.mapObject.nativeElement.contentDocument!;
      const svgRoot = svgDoc.querySelector('svg') as SVGSVGElement | null;
      const train = svgDoc.getElementById('movingTrain') as SVGImageElement | null;
      
      if (svgRoot && train) {
        const firstMove = this.events.find(e => e.kind === 'move') as MoveEv | undefined;
        if (firstMove) {
          const el = svgDoc.getElementById(firstMove.from) as SVGGraphicsElement | null;
          if (el) {
            const center = this.getCenter(el, svgRoot);
            train.setAttribute('x', String(center.x - 16));
            train.setAttribute('y', String(center.y - 16));
          }
        }
      }
    }
  }

  /* ======================================================
     (load) dell'SVG
     ==================================================== */
  async onSvgLoad(): Promise<void> {
    if (this.station.stop_name !== 'Stazione di CAGLIARI') return;

    /* 1) carica il piano PDDL una sola volta */
    if (!this.events.length) {
      const raw = await firstValueFrom(this.http.get('assets/Plan.txt', { responseType: 'text' }));
      this.events = this.parseEvents(raw);
    }

    const svgDoc  = this.mapObject.nativeElement.contentDocument!;
    const svgRoot = svgDoc.querySelector('svg') as SVGSVGElement | null;
    if (!svgRoot) return;

    /* 2) ▶ (OPZIONALE) visibilità iniziale dei binari chiusi ◀
       ---------------------------------------------------------
       Le righe qui sotto nascondevano i track con data-status="closed".
       Le abbiamo commentate: i binari resteranno sempre visibili.
    */
    /*
    svgDoc.querySelectorAll<SVGGraphicsElement>('line[data-status="closed"]')
          .forEach(l => { l.style.opacity = '0'; });
    */

    /* 3) trenino (GIF), creato la prima volta e riutilizzato */
    let train = svgDoc.getElementById('movingTrain') as SVGImageElement | null;
    if (!train) {
      train = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'image');
      train.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'train_icon.png');
      train.setAttribute('width', '22');
      train.setAttribute('height', '22');
      train.setAttribute('id', 'movingTrain');
      train.style.pointerEvents = 'none';
      svgRoot.appendChild(train);
    }

    // Posiziona il treno alla posizione corrente se l'animazione è in pausa
    // altrimenti alla posizione iniziale
    if (this.currentEventIndex === 0 && this.currentEventProgress === 0) {
      const firstMove = this.events.find(e => e.kind === 'move') as MoveEv | undefined;
      if (firstMove) {
        const el = svgDoc.getElementById(firstMove.from) as SVGGraphicsElement | null;
        if (el) {
          const center = this.getCenter(el, svgRoot);
          train.setAttribute('x', String(center.x - 16));
          train.setAttribute('y', String(center.y - 16));
        }
      }
    }
  }

  /* ======================================================
     Parser eventi (move + open/close-track)
     ==================================================== */
  private parseEvents(txt: string): Event[] {
    const evs: Event[] = [];

    const reMove  = /([\d.]+)\s*:\s*\(move\b[^\s]*\s+([^\s]+)\s+([^\s)]+)\)/gi;
    for (const m of txt.matchAll(reMove))
      evs.push({ kind:'move', at:+m[1], from:m[2], to:m[3] });

    const reTrack = /([\d.]+)\s*:\s*\((open|close)-track\s+([^\s]+)\s+([^\s)]+)\)/gi;
    for (const m of txt.matchAll(reTrack))
      evs.push({ kind:'track', at:+m[1], a:m[3], b:m[4], status:m[2]==='open'?'open':'closed' });

    return evs.sort((a,b)=>a.at-b.at);
  }

  /* ======================================================
     Metodo helper per calcolare il centro
     ==================================================== */
  private getCenter(el: SVGGraphicsElement, svgRoot: SVGSVGElement) {
    const r = el.getBoundingClientRect();
    const p = svgRoot.createSVGPoint();
    p.x = r.left + r.width  / 2;
    p.y = r.top  + r.height / 2;
    return p.matrixTransform(svgRoot.getScreenCTM()!.inverse());
  }

  /* ======================================================
     Timeline animata che riprende dal punto corrente
     ==================================================== */
  private runTimelineFromCurrent(
    svgDoc: Document,
    svgRoot: SVGSVGElement,
    train: SVGImageElement,
    evs: Event[]
  ) {
    // Se non stiamo più animando, esci
    if (!this.isAnimating) return;

    const center = (el: SVGGraphicsElement) => this.getCenter(el, svgRoot);
    
    const setTrain = (p:{x:number;y:number}) => {
      train.setAttribute('x', String(p.x - 16));
      train.setAttribute('y', String(p.y - 16));
    };

    const step = (i:number, progressOffset = 0) => {
      // Controlla se dobbiamo fermare l'animazione
      if (!this.isAnimating) return;

      // Aggiorna l'indice corrente
      this.currentEventIndex = i;

      const cur   = evs[i];
      const nextI = (i+1) % evs.length;
      const nextAt = evs[nextI].at > cur.at ? evs[nextI].at : cur.at + 1;
      const totalDurMs = (nextAt - cur.at) * 1000 * SPEED;
      const remainingDurMs = totalDurMs * (1 - progressOffset);

      /* --- EVENTO track (apri/chiudi): ora non nasconde più la linea --- */
      if (cur.kind === 'track') {
        // ★ se vuoi riattivare la sparizione/riapparizione, togli i commenti:
        /*
        [`${cur.a},${cur.b}`, `${cur.b},${cur.a}`].forEach(sel => {
          const line = svgDoc.querySelector<SVGGraphicsElement>(`line[data-path="${sel}"]`);
          if (line) {
            line.style.transition = 'opacity 300ms linear';
            line.style.opacity = cur.status === 'open' ? '1' : '0';
            line.setAttribute('data-status', cur.status);
          }
        });
        */
        this.currentEventProgress = 0;
        this.currentTimeoutId = window.setTimeout(() => step(nextI), remainingDurMs);
        return;
      }

      /* --- EVENTO move --- */
      const fromEl = svgDoc.getElementById(cur.from) as SVGGraphicsElement | null;
      const toEl   = svgDoc.getElementById(cur.to)   as SVGGraphicsElement | null;
      if (!(fromEl && toEl)) { 
        this.currentEventProgress = 0;
        this.currentTimeoutId = window.setTimeout(() => step(nextI), 0);
        return; 
      }

      const p0 = center(fromEl);
      const p1 = center(toEl);
      const t0 = performance.now();

      // Se stiamo riprendendo un'animazione di movimento in corso,
      // calcola la posizione iniziale basata sul progresso
      const startProgress = progressOffset;
      const startPos = {
        x: p0.x + startProgress * (p1.x - p0.x),
        y: p0.y + startProgress * (p1.y - p0.y)
      };

      // Imposta la posizione iniziale
      setTrain(startPos);

      const tick = (n:number) => {
        // Controlla se dobbiamo fermare l'animazione
        if (!this.isAnimating) {
          this.currentAnimationId = null;
          return;
        }

        const elapsed = n - t0;
        const k = Math.min(elapsed / remainingDurMs, 1);
        const totalProgress = startProgress + k * (1 - startProgress);
        
        // Aggiorna il progresso corrente
        this.currentEventProgress = totalProgress;
        
        setTrain({
          x: p0.x + totalProgress * (p1.x - p0.x), 
          y: p0.y + totalProgress * (p1.y - p0.y)
        });
        
        if (k < 1) {
          this.currentAnimationId = requestAnimationFrame(tick);
        } else {
          this.currentAnimationId = null;
          this.currentEventProgress = 0;
          step(nextI);
        }
      };
      this.currentAnimationId = requestAnimationFrame(tick);
    };

    // Inizia dall'indice e progresso correnti
    step(this.currentEventIndex, this.currentEventProgress);
  }

  /* ======================================================
     Timeline animata originale (ora utilizzata solo internamente)
     ==================================================== */
  private runTimeline(
    svgDoc: Document,
    svgRoot: SVGSVGElement,
    train: SVGImageElement,
    evs: Event[]
  ) {
    // Reset dei valori di stato e avvia dall'inizio
    this.currentEventIndex = 0;
    this.currentEventProgress = 0;
    this.runTimelineFromCurrent(svgDoc, svgRoot, train, evs);
  }
}