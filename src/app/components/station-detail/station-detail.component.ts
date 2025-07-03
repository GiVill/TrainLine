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
interface MoveEv    { kind: 'move';    at: number; tr: string; from: string; to: string; duration: number; }
interface TrackEv   { kind: 'track';   at: number; a: string;  b: string;  status: 'open' | 'closed'; }
interface SwitchEv  { kind: 'switch';  at: number; switch: string; status: 'open' | 'closed'; }

type Event = ReleaseEv | MoveEv | TrackEv | SwitchEv;

// ────────────────────────────────────────────────────
// Interfaccia per i commenti dell'animazione
// ────────────────────────────────────────────────────
interface AnimationComment {
  stepNumber: number;
  time: number;
  description: string;
  eventType: 'release' | 'move' | 'track' | 'switch';
}

// ────────────────────────────────────────────────────
// Interfaccia per le destinazioni dei treni
// ────────────────────────────────────────────────────
interface TrainDestination {
  trainId: string;
  destination: string;
  isArrived?: boolean;
  isAnimating?: boolean;
}

// ────────────────────────────────────────────────────
// Interfaccia per le animazioni attive
// ────────────────────────────────────────────────────
interface ActiveAnimation {
  trainId: string;
  startTime: number;
  endTime: number;
  fromElement: SVGGraphicsElement;
  toElement: SVGGraphicsElement;
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  img: SVGImageElement;
}

const ORIG = 'data-orig-status'; // attribute dove salviamo lo stato di partenza

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
  private animationStartTime: number = 0;
  private currentAnimationTime: number = 0;

  private trainImgs = new Map<string, SVGImageElement>();
  private activeAnimations = new Map<string, ActiveAnimation>();

  // ────────── commenti animazione ──────────
  animationComments: AnimationComment[] = [];
  currentComment: AnimationComment | null = null;

  // ────────── destinazioni treni ──────────
  trainDestinations: TrainDestination[] = [];
  private trainFinalDestinations = new Map<string, string>(); // Mappa treno -> destinazione finale

  // ───────────────────────────────────────── SVG LOAD ─────────────────────────────────────────
  async onSvgLoad() {
    if (this.station.stop_name !== 'Stazione di CAGLIARI') return;

    // 1. Carica il piano una sola volta
    if (!this.events.length) {
      const raw = await firstValueFrom(this.http.get('assets/Plan.txt', { responseType: 'text' }));
      this.events = this.parseEvents(raw);
      this.generateComments();
      this.extractTrainDestinations(raw);
    }

    // 2. Segna lo stato originale dei binari (una sola volta)
    this.stampOriginalTrackStatus();

    // 3. Applica visibilità coerente con data-status corrente
    this.applyTrackVisibility();

    this.ready = true;
    this.resetAnimation();
  }

  // ───────────────────────────────────────── CONTROLLI UI ─────────────────────────────────────
  startAnimation() { 
    if (this.ready && !this.isAnimating) { 
      this.isAnimating = true; 
      this.animationStartTime = performance.now();
      this.currentAnimationTime = 0;
      this.animationLoop(); 
    } 
  }

  stopAnimation() { 
    this.isAnimating = false; 
    if (this.rafId) cancelAnimationFrame(this.rafId); 
    if (this.timeoutId) clearTimeout(this.timeoutId); 
    this.activeAnimations.clear();
  }

  resetAnimation() {
    this.stopAnimation();
    this.currentIdx = 0;
    this.currentComment = null;
    this.currentAnimationTime = 0;

    // Reset stato destinazioni
    this.trainDestinations.forEach(dest => {
      dest.isArrived = false;
      dest.isAnimating = false;
    });

    // rimuove eventuali trenini
    this.trainImgs.forEach(img => img.remove());
    this.trainImgs.clear();
    this.activeAnimations.clear();

    // ripristina lo stato originale dei binari e aggiorna visibilità
    this.restoreOriginalTrackStatus();
    this.applyTrackVisibility();
  }

  // ───────────────────────────────────────── ESTRAZIONE DESTINAZIONI ─────────────────────────────
  private extractTrainDestinations(planText: string) {
    const destinations = new Map<string, string>();

    // Estrae tutti gli eventi di movimento dal piano
    const moveEvents: { time: number, train: string, from: string, to: string }[] = [];

    // Nuovo regex per il formato aggiornato: MOVE-FROM-TO TRAIN
    const moveRegex = /([\d.]+):\s*\(MOVE-([^-]+)-([^\s]+)\s+([^)]+)\)/gi;

    for (const match of planText.matchAll(moveRegex)) {
      const from = this.normalizeLocationName(match[2]);
      const to = this.normalizeLocationName(match[3]);

      moveEvents.push({
        time: parseFloat(match[1]),
        train: match[4],
        from: from,
        to: to
      });
    }

    // Ordina gli eventi per tempo
    moveEvents.sort((a, b) => a.time - b.time);

    // Per ogni treno, trova l'ultima destinazione
    const trainLastDestination = new Map<string, string>();

    moveEvents.forEach(event => {
      trainLastDestination.set(event.train, event.to);
    });

    // Salva le destinazioni finali per uso interno
    this.trainFinalDestinations = new Map(trainLastDestination);

    // Converte la mappa in array di oggetti, filtrando solo le destinazioni che sono "stop-"
    this.trainDestinations = Array.from(trainLastDestination.entries())
      .filter(([trainId, destination]) => destination.startsWith('stop-'))
      .map(([trainId, destination]) => ({
        trainId,
        destination: this.formatLocationName(destination),
        isArrived: false,
        isAnimating: false
      }));

    console.log('Destinazioni treni estratte:', this.trainDestinations);
  }

  // ───────────────────────────────────────── NORMALIZZAZIONE NOMI POSIZIONI ─────────────────────
  private normalizeLocationName(name: string): string {
    // Converte i nomi dal nuovo formato al formato originale
    name = name.toLowerCase();

    if (name.startsWith('start')) {
      return `start-${name.replace('start', '')}`;
    }
    if (name.startsWith('stop')) {
      return `stop-${name.replace('stop', '')}`;
    }
    if (name.startsWith('switch')) {
      return `switch-${name.replace('switch', '')}`;
    }
    if (name.startsWith('point')) {
      return `point-${name.replace('point', '')}`;
    }

    return name;
  }

  // ───────────────────────────────────────── CONTROLLO ARRIVO A DESTINAZIONE ─────────────────────
  private checkTrainArrival(trainId: string, currentLocation: string) {
    const finalDestination = this.trainFinalDestinations.get(trainId);

    if (finalDestination && currentLocation === finalDestination) {
      // Il treno ha raggiunto la destinazione finale
      const destinationItem = this.trainDestinations.find(dest => dest.trainId === trainId);

      if (destinationItem && !destinationItem.isArrived) {
        console.log(`Treno ${trainId} è arrivato alla destinazione finale: ${finalDestination}`);

        // Avvia l'animazione di arrivo
        destinationItem.isAnimating = true;
        destinationItem.isArrived = false;

        // Dopo un breve delay, completa l'animazione
        setTimeout(() => {
          if (destinationItem) {
            destinationItem.isAnimating = false;
            destinationItem.isArrived = true;
          }
        }, 2000); // Durata dell'animazione di arrivo
      }
    }
  }

  // ───────────────────────────────────────── GENERAZIONE COMMENTI ─────────────────────────────
  private generateComments() {
    this.animationComments = this.events.map((event, index) => ({
      stepNumber: index + 1,
      time: event.at,
      description: this.generateCommentText(event),
      eventType: event.kind
    }));
  }

  private generateCommentText(event: Event): string {
    switch (event.kind) {
      case 'release':
        return `Il treno ${event.tr} viene rilasciato dalla posizione ${this.formatLocationName(event.loc)}`;

      case 'move':
        const fromFormatted = this.formatLocationName(event.from);
        const toFormatted = this.formatLocationName(event.to);

        // Controlla se il treno sta arrivando alla destinazione finale
        const finalDestination = this.trainFinalDestinations.get(event.tr);
        const isArrivingAtFinalDestination = finalDestination === event.to && event.to.startsWith('stop-');

        if (isArrivingAtFinalDestination) {
          return `🎯 Il treno ${event.tr} arriva alla destinazione finale: ${toFormatted} (durata: ${event.duration}s)`;
        }

        return `Il treno ${event.tr} si sposta da ${fromFormatted} a ${toFormatted} (durata: ${event.duration}s)`;

      case 'track':
        const action = event.status === 'open' ? 'apre' : 'chiude';
        return `Il binario tra ${this.formatLocationName(event.a)} e ${this.formatLocationName(event.b)} si ${action}`;

      case 'switch':
        const switchAction = event.status === 'open' ? 'apre' : 'chiude';
        return `Lo scambio ${this.formatLocationName(event.switch)} si ${switchAction}`;

      default:
        return 'Azione sconosciuta';
    }
  }

  private formatLocationName(location: string): string {
    // Formatta i nomi delle posizioni per renderli più leggibili
    if (location.startsWith('start-')) {
      return `posizione di partenza ${location.replace('start-', '')}`;
    }
    if (location.startsWith('stop-')) {
      return `Fermata ${location.replace('stop-', '')}`;
    }
    if (location.startsWith('switch-')) {
      return `Scambio ${location.replace('switch-', '')}`;
    }
    if (location.startsWith('point-')) {
      return `Punto ${location.replace('point-', '')}`;
    }
    return location;
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

    // Parsing per eventi MOVE nel nuovo formato: MOVE-FROM-TO TRAIN [D:duration; C:cost]
    const move = /([\d.]+):\s*\(MOVE-([^-]+)-([^\s]+)\s+([^)]+)\)\s*\[D:([\d.]+);[^\]]*\]/gi;
    for (const m of txt.matchAll(move)) {
      const from = this.normalizeLocationName(m[2]);
      const to = this.normalizeLocationName(m[3]);
      const duration = parseFloat(m[5]);
      
      evs.push({
        kind: 'move',
        at: +m[1],
        tr: m[4],
        from: from,
        to: to,
        duration: duration
      });
    }

    // Parsing per eventi OPEN-SWITCH e CLOSE-SWITCH
    const switchOp = /([\d.]+):\s*\((OPEN|CLOSE)-SWITCH\s+([^)]+)\)/gi;
    for (const m of txt.matchAll(switchOp)) {
      const switchName = this.normalizeLocationName(m[3]);
      evs.push({
        kind: 'switch',
        at: +m[1],
        switch: switchName,
        status: m[2].toLowerCase() === 'open' ? 'open' : 'closed'
      });
    }

    // Manteniamo il parsing originale per retrocompatibilità (senza durata)
    const moveOld = /([\d.]+)\s*:\s*\(move\s+([^\s]+)\s+([^\s]+)\s+([^\s)]+)\)/gi;
    for (const m of txt.matchAll(moveOld)) {
      evs.push({ 
        kind:'move', 
        at:+m[1], 
        tr:m[2], 
        from:m[3], 
        to:m[4],
        duration: 1.0 // durata di default per compatibilità
      });
    }

    const rel = /([\d.]+)\s*:\s*\(release\s+([^\s]+)\s+([^\s)]+)\)/gi;
    for (const m of txt.matchAll(rel)) {
      evs.push({ kind:'release', at:+m[1], tr:m[2], loc:m[3] });
    }

    const trk = /([\d.]+)\s*:\s*\((open|close)-track\s+([^\s]+)\s+([^\s)]+)\)/gi;
    for (const m of txt.matchAll(trk)) {
      evs.push({ kind:'track', at:+m[1], a:m[3], b:m[4], status:m[2]==='open'?'open':'closed' });
    }

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
    img.setAttributeNS('http://www.w3.org/1999/xlink','href','treno_rosso.png');
    img.setAttribute('width','27'); img.setAttribute('height','27'); img.style.pointerEvents='none';
    svgDoc.querySelector('svg')!.appendChild(img);
    this.trainImgs.set(tr,img);
    return img;
  }

  private calculateDistance(p1: {x: number, y: number}, p2: {x: number, y: number}): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ───────────────────────────────────────── ANIMAZIONE LOOP ─────────────────────────────────
  private animationLoop() {
    if (!this.isAnimating) return;

    const now = performance.now();
    this.currentAnimationTime = (now - this.animationStartTime) / 1000; // tempo in secondi

    // Processa tutti gli eventi che dovrebbero essere attivi in questo momento
    this.processEvents();
    
    // Aggiorna tutte le animazioni attive
    this.updateActiveAnimations();

    // Continua il loop
    this.rafId = requestAnimationFrame(() => this.animationLoop());
  }

  private processEvents() {
    const svgDoc = this.mapObject.nativeElement.contentDocument!;
    const svgRoot = svgDoc.querySelector('svg') as SVGSVGElement;

    // Processa tutti gli eventi che dovrebbero iniziare ora
    while (this.currentIdx < this.events.length) {
      const event = this.events[this.currentIdx];
      
      if (event.at > this.currentAnimationTime) {
        break; // Eventi futuri, aspetta
      }

      // Aggiorna il commento corrente
      this.currentComment = this.animationComments[this.currentIdx];

      switch (event.kind) {
        case 'release':
          this.handleReleaseEvent(event, svgDoc, svgRoot);
          break;

        case 'move':
          this.handleMoveEvent(event, svgDoc, svgRoot);
          break;

        case 'track':
          this.handleTrackEvent(event, svgDoc);
          break;

        case 'switch':
          this.handleSwitchEvent(event, svgDoc);
          break;
      }

      this.currentIdx++;
    }
  }

  private handleReleaseEvent(event: ReleaseEv, svgDoc: Document, svgRoot: SVGSVGElement) {
    const img = this.getTrain(svgDoc, event.tr);
    const loc = svgDoc.getElementById(event.loc) as SVGGraphicsElement | null;
    if (loc) {
      const p = this.center(svgRoot, loc);
      img.setAttribute('x', String(p.x - 12));
      img.setAttribute('y', String(p.y - 12));
    }
  }

  private handleMoveEvent(event: MoveEv, svgDoc: Document, svgRoot: SVGSVGElement) {
    const img = this.getTrain(svgDoc, event.tr);
    const from = svgDoc.getElementById(event.from) as SVGGraphicsElement | null;
    const to = svgDoc.getElementById(event.to) as SVGGraphicsElement | null;
    
    if (!(from && to)) return;

    const startPos = this.center(svgRoot, from);
    const endPos = this.center(svgRoot, to);
    
    // Usa la durata dal piano invece di calcolarla dalla distanza
    const duration = event.duration;

    // Crea o aggiorna l'animazione attiva
    this.activeAnimations.set(event.tr, {
      trainId: event.tr,
      startTime: this.currentAnimationTime,
      endTime: this.currentAnimationTime + duration,
      fromElement: from,
      toElement: to,
      startPos: startPos,
      endPos: endPos,
      img: img
    });

    console.log(`Treno ${event.tr}: movimento da ${event.from} a ${event.to} - durata: ${duration}s`);
  }

  private handleTrackEvent(event: TrackEv, svgDoc: Document) {
    [`${event.a},${event.b}`, `${event.b},${event.a}`].forEach(path => {
      const line = svgDoc.querySelector<SVGGraphicsElement>(`line[data-path="${path}"]`);
      if (line) {
        line.style.transition = 'opacity 300ms linear';
        line.setAttribute('data-status', event.status);
        line.style.opacity = event.status === 'open' ? '1' : '0';
      }
    });
  }

  private handleSwitchEvent(event: SwitchEv, svgDoc: Document) {
    const switchEl = svgDoc.getElementById(event.switch) as SVGGraphicsElement | null;
    if (switchEl) {
      switchEl.style.transition = 'opacity 300ms linear';
      switchEl.setAttribute('data-status', event.status);
      switchEl.style.opacity = event.status === 'open' ? '1' : '0.3';
    }

    // Trova anche eventuali linee collegate a questo switch
    const lines = svgDoc.querySelectorAll<SVGGraphicsElement>(`line[data-path*="${event.switch}"]`);
    lines.forEach(line => {
      line.style.transition = 'opacity 300ms linear';
      line.setAttribute('data-status', event.status);
      line.style.opacity = event.status === 'open' ? '1' : '0';
    });
  }

  private updateActiveAnimations() {
    const completedAnimations: string[] = [];

    this.activeAnimations.forEach((animation, trainId) => {
      const progress = Math.min((this.currentAnimationTime - animation.startTime) / (animation.endTime - animation.startTime), 1);
      
      if (progress >= 1) {
        // Animazione completata
        animation.img.setAttribute('x', String(animation.endPos.x - 12));
        animation.img.setAttribute('y', String(animation.endPos.y - 12));
        
        // Controlla se il treno è arrivato a destinazione
        const moveEvent = this.events.find(e => 
          e.kind === 'move' && 
          e.tr === trainId && 
          e.at <= this.currentAnimationTime
        ) as MoveEv;
        
        if (moveEvent) {
          this.checkTrainArrival(trainId, moveEvent.to);
        }
        
        completedAnimations.push(trainId);
      } else {
        // Aggiorna posizione interpolata
        const currentX = animation.startPos.x + (animation.endPos.x - animation.startPos.x) * progress;
        const currentY = animation.startPos.y + (animation.endPos.y - animation.startPos.y) * progress;
        
        animation.img.setAttribute('x', String(currentX - 12));
        animation.img.setAttribute('y', String(currentY - 12));
      }
    });

    // Rimuovi animazioni completate
    completedAnimations.forEach(trainId => {
      this.activeAnimations.delete(trainId);
    });
  }
}