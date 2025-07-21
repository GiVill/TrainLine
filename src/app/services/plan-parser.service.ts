import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// ────────────────────────────────────────────────────
// Tipi evento estratti dal piano - VERSIONE AGGIORNATA
// ────────────────────────────────────────────────────

export interface StartTrainEv {
  kind: 'start-train';
  at: number;
  train: string;
  startLocation: string;
  path: string[]; // percorso completo
  duration: number;
  cost: number;
}

export interface MoveTrainEv {
  kind: 'move-train';
  at: number;
  train: string;
  from: string;
  to: string;
  via?: string; // track utilizzato
  duration: number;
  cost: number;
}

export interface MoveThroughSwitchEv {
  kind: 'move-through-switch';
  at: number;
  train: string;
  startLocation: string;
  path: string[]; // percorso completo attraverso gli switch
  duration: number;
  cost: number;
}

export interface SwitchTrackEv {
  kind: 'switch-track';
  at: number;
  switch: string;
  fromTrack: string;
  toTrack: string;
  tracks: string[]; // tutti i track coinvolti
  duration: number;
  cost: number;
}

export interface ReserveTrackEv {
  kind: 'reserve-track';
  at: number;
  train: string;
  track: string;
  duration: number;
  cost: number;
}

// Manteniamo i tipi originali per retrocompatibilità
export interface ReleaseEv {
  kind: 'release';
  at: number;
  tr: string;
  loc: string;
}

export interface MoveEv {
  kind: 'move';
  at: number;
  tr: string;
  from: string;
  to: string;
  duration: number;
}

export interface TrackEv {
  kind: 'track';
  at: number;
  a: string;
  b: string;
  status: 'open' | 'closed';
}

export interface SwitchEv {
  kind: 'switch';
  at: number;
  switch: string;
  status: 'open' | 'closed';
}

export type Event = StartTrainEv | MoveTrainEv | MoveThroughSwitchEv | SwitchTrackEv | ReserveTrackEv | ReleaseEv | MoveEv | TrackEv | SwitchEv;

// ────────────────────────────────────────────────────
// Interfaccia per i commenti dell'animazione - AGGIORNATA
// ────────────────────────────────────────────────────
export interface AnimationComment {
  stepNumber: number;
  time: number;
  description: string;
  eventType: Event['kind'];
}

// ────────────────────────────────────────────────────
// Interfaccia per le destinazioni dei treni
// ────────────────────────────────────────────────────
export interface TrainDestination {
  trainId: string;
  destination: string;
  isArrived?: boolean;
  isAnimating?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PlanParserService {
  private cachedEvents: Event[] = [];
  private cachedComments: AnimationComment[] = [];
  private cachedDestinations: TrainDestination[] = [];
  private trainFinalDestinations = new Map<string, string>();

  constructor(private http: HttpClient) {}

  /**
   * Carica e parsifica il piano degli eventi
   */
  async loadAndParsePlan(planPath: string = 'assets/Plan.txt'): Promise<{
    events: Event[];
    comments: AnimationComment[];
    destinations: TrainDestination[];
    finalDestinations: Map<string, string>;
  }> {
    if (this.cachedEvents.length === 0) {
      const planText = await firstValueFrom(
        this.http.get(planPath, { responseType: 'text' })
      );

      this.cachedEvents = this.parseEvents(planText);
      this.cachedComments = this.generateComments(this.cachedEvents);
      this.extractTrainDestinations(planText);
    }

    return {
      events: [...this.cachedEvents],
      comments: [...this.cachedComments],
      destinations: [...this.cachedDestinations],
      finalDestinations: new Map(this.trainFinalDestinations)
    };
  }

  /**
   * Parsifica gli eventi dal testo del piano - VERSIONE AGGIORNATA
   */
  private parseEvents(txt: string): Event[] {
    const evs: Event[] = [];

    // 1. START-TRAIN: (START-TRAIN TRAIN-3 START-1 SWITCH-1 TRACK-35) [D:0.10; C:0.10]
    const startTrainRegex = /([\d.]+):\s*\(START-TRAIN\s+([^\s]+)\s+([^)]+)\)\s*\[D:([\d.]+);\s*C:([\d.]+)\]/gi;
    for (const match of txt.matchAll(startTrainRegex)) {
      const pathElements = match[3].trim().split(/\s+/);
      const startLocation = pathElements[0];

      evs.push({
        kind: 'start-train',
        at: parseFloat(match[1]),
        train: match[2],
        startLocation: this.normalizeLocationName(startLocation),
        path: pathElements.map(el => this.normalizeLocationName(el)),
        duration: parseFloat(match[4]),
        cost: parseFloat(match[5])
      });
    }

    // 2. MOVE-TRAIN: (MOVE-TRAIN TRAIN-1 SWITCH-8 EXIT-1 TRACK-36) [D:3.00; C:0.10]
    const moveTrainRegex = /([\d.]+):\s*\(MOVE-TRAIN\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)(?:\s+([^\s)]+))?\)\s*\[D:([\d.]+);\s*C:([\d.]+)\]/gi;
    for (const match of txt.matchAll(moveTrainRegex)) {
      evs.push({
        kind: 'move-train',
        at: parseFloat(match[1]),
        train: match[2],
        from: this.normalizeLocationName(match[3]),
        to: this.normalizeLocationName(match[4]),
        via: match[5] ? this.normalizeLocationName(match[5]) : undefined,
        duration: parseFloat(match[6]),
        cost: parseFloat(match[7])
      });
    }

    // 3. MOVE-THROUGH-SWITCH: (MOVE-THROUGH-SWITCH TRAIN-2 START-1 SWITCH-1 SWITCH-2 TRACK-35 SWITCH-1 TRACK-32)
    const moveThroughSwitchRegex = /([\d.]+):\s*\(MOVE-THROUGH-SWITCH\s+([^\s]+)\s+([^)]+)\)(?:\s*\[D:([\d.]+);\s*C:([\d.]+)\])?/gi;
    // Nel metodo parseEvents, sostituisci la sezione MOVE-THROUGH-SWITCH con:
    for (const match of txt.matchAll(moveThroughSwitchRegex)) {
      const pathElements = match[3].trim().split(/\s+/);
      const startLocation = pathElements[0];

      evs.push({
        kind: 'move-through-switch',
        at: parseFloat(match[1]),
        train: match[2],
        startLocation: this.normalizeLocationName(startLocation),
        path: pathElements.map(el => this.normalizeLocationName(el)),
        duration: match[4] ? parseFloat(match[4]) : 2.0, // default duration se non specificata
        cost: match[5] ? parseFloat(match[5]) : 0.1 // default cost se non specificato
      });
    }


    // 4. SWITCH-TRACK: (SWITCH-TRACK SWITCH-12 TRACK-21 TRACK-22 TRACK-21 TRACK-7) [D:1.50; C:0.10]
    const switchTrackRegex = /([\d.]+):\s*\(SWITCH-TRACK\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+([^)]+)\)\s*\[D:([\d.]+);\s*C:([\d.]+)\]/gi;
    for (const match of txt.matchAll(switchTrackRegex)) {
      const tracks = match[5].trim().split(/\s+/);

      evs.push({
        kind: 'switch-track',
        at: parseFloat(match[1]),
        switch: this.normalizeLocationName(match[2]),
        fromTrack: this.normalizeLocationName(match[3]),
        toTrack: this.normalizeLocationName(match[4]),
        tracks: [match[3], match[4], ...tracks].map(t => this.normalizeLocationName(t)),
        duration: parseFloat(match[6]),
        cost: parseFloat(match[7])
      });
    }

    // 5. RESERVE-TRACK: (RESERVE-TRACK TRAIN-3 TRACK-22) [D:0.05; C:0.10]
    const reserveTrackRegex = /([\d.]+):\s*\(RESERVE-TRACK\s+([^\s]+)\s+([^\s)]+)\)\s*\[D:([\d.]+);\s*C:([\d.]+)\]/gi;
    for (const match of txt.matchAll(reserveTrackRegex)) {
      evs.push({
        kind: 'reserve-track',
        at: parseFloat(match[1]),
        train: match[2],
        track: this.normalizeLocationName(match[3]),
        duration: parseFloat(match[4]),
        cost: parseFloat(match[5])
      });
    }

    // ──── PARSING ORIGINALE PER RETROCOMPATIBILITÀ ────

    // Parsing per eventi MOVE nel formato originale: MOVE-FROM-TO TRAIN [D:duration; C:cost]
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

  /**
   * Estrae le destinazioni dei treni dal piano - AGGIORNATA
   */
  private extractTrainDestinations(planText: string): void {
    const trainLastDestination = new Map<string, string>();

    // Estrae destinazioni da START-TRAIN
    const startTrainRegex = /([\d.]+):\s*\(START-TRAIN\s+([^\s]+)\s+([^)]+)\)/gi;
    for (const match of planText.matchAll(startTrainRegex)) {
      const pathElements = match[3].trim().split(/\s+/);
      const lastDestination = pathElements[pathElements.length - 1];
      trainLastDestination.set(match[2], this.normalizeLocationName(lastDestination));
    }

    // Estrae destinazioni da MOVE-TRAIN
    const moveTrainRegex = /([\d.]+):\s*\(MOVE-TRAIN\s+([^\s]+)\s+([^\s]+)\s+([^\s)]+)/gi;
    for (const match of planText.matchAll(moveTrainRegex)) {
      trainLastDestination.set(match[2], this.normalizeLocationName(match[4]));
    }

    // Estrae destinazioni da MOVE-THROUGH-SWITCH
    const moveThroughSwitchRegex = /([\d.]+):\s*\(MOVE-THROUGH-SWITCH\s+([^\s]+)\s+([^)]+)\)\s*(?:\[D:([\d.]+);\s*C:([\d.]+)\])?/gi;
    for (const match of planText.matchAll(moveThroughSwitchRegex)) {
      const pathElements = match[3].trim().split(/\s+/);
      const lastDestination = pathElements[pathElements.length - 1];
      trainLastDestination.set(match[2], this.normalizeLocationName(lastDestination));
    }

    // Mantieni compatibilità con il formato originale
    const moveEvents: { time: number, train: string, to: string }[] = [];
    const moveRegex = /([\d.]+):\s*\(MOVE-([^-]+)-([^\s]+)\s+([^)]+)\)/gi;
    for (const match of planText.matchAll(moveRegex)) {
      const to = this.normalizeLocationName(match[3]);
      moveEvents.push({
        time: parseFloat(match[1]),
        train: match[4],
        to: to
      });
    }

    moveEvents.sort((a, b) => a.time - b.time);
    moveEvents.forEach(event => {
      trainLastDestination.set(event.train, event.to);
    });

    // Salva le destinazioni finali per uso interno
    this.trainFinalDestinations = new Map(trainLastDestination);

    // Converte la mappa in array di oggetti, filtrando solo le destinazioni finali interessanti
    this.cachedDestinations = Array.from(trainLastDestination.entries())
      .filter(([trainId, destination]) => destination.startsWith('stop-') || destination.startsWith('exit-'))
      .map(([trainId, destination]) => ({
        trainId,
        destination: this.formatLocationName(destination),
        isArrived: false,
        isAnimating: false
      }));

    console.log('Destinazioni treni estratte:', this.cachedDestinations);
    console.log('Mappa destinazioni finali:', this.trainFinalDestinations);
  }

  /**
   * Genera i commenti per l'animazione - AGGIORNATA
   */
  private generateComments(events: Event[]): AnimationComment[] {
    return events.map((event, index) => ({
      stepNumber: index + 1,
      time: event.at,
      description: this.generateCommentText(event),
      eventType: event.kind
    }));
  }

  /**
   * Genera il testo del commento per un evento - AGGIORNATA
   */
  private generateCommentText(event: Event): string {
    switch (event.kind) {
      case 'start-train':
        const pathText = event.path.map(p => this.formatLocationName(p)).join(' → ');
        return `🚂 Il treno ${event.train} inizia il percorso da ${this.formatLocationName(event.startLocation)}: ${pathText} (durata: ${event.duration}s)`;

      case 'move-train':
        const fromFormatted = this.formatLocationName(event.from);
        const toFormatted = this.formatLocationName(event.to);
        const finalDestination = this.trainFinalDestinations.get(event.train);
        const isArrivingAtFinalDestination = finalDestination === event.to && (event.to.startsWith('stop-') || event.to.startsWith('exit-'));

        if (isArrivingAtFinalDestination) {
          return `🎯 Il treno ${event.train} arriva alla destinazione finale: ${toFormatted} (durata: ${event.duration}s)`;
        }

        const viaText = event.via ? ` via ${this.formatLocationName(event.via)}` : '';
        return `🚊 Il treno ${event.train} si sposta da ${fromFormatted} a ${toFormatted}${viaText} (durata: ${event.duration}s)`;

      case 'move-through-switch':
        const switchPath = event.path.map(p => this.formatLocationName(p)).join(' → ');
        return `🔀 Il treno ${event.train} attraversa gli scambi: ${switchPath} (durata: ${event.duration}s)`;

      case 'switch-track':
        const tracksText = event.tracks.map(t => this.formatLocationName(t)).join(', ');
        return `⚙️ Lo scambio ${this.formatLocationName(event.switch)} commuta da ${this.formatLocationName(event.fromTrack)} a ${this.formatLocationName(event.toTrack)} (binari: ${tracksText}, durata: ${event.duration}s)`;

      case 'reserve-track':
        return `🔒 Il treno ${event.train} riserva il binario ${this.formatLocationName(event.track)} (durata: ${event.duration}s)`;

      // Mantieni i commenti originali per retrocompatibilità
      case 'release':
        return `Il treno ${event.tr} viene rilasciato dalla posizione ${this.formatLocationName(event.loc)}`;

      case 'move':
        const moveFromFormatted = this.formatLocationName(event.from);
        const moveToFormatted = this.formatLocationName(event.to);
        const moveFinalDestination = this.trainFinalDestinations.get(event.tr);
        const moveIsArrivingAtFinalDestination = moveFinalDestination === event.to && event.to.startsWith('stop-');

        if (moveIsArrivingAtFinalDestination) {
          return `🎯 Il treno ${event.tr} arriva alla destinazione finale: ${moveToFormatted} (durata: ${event.duration}s)`;
        }

        return `Il treno ${event.tr} si sposta da ${moveFromFormatted} a ${moveToFormatted} (durata: ${event.duration}s)`;

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

  /**
   * Normalizza i nomi delle posizioni - AGGIORNATA
   */
  private normalizeLocationName(name: string): string {
    if (!name) return name;

    name = name.toLowerCase().trim();

    if (name.startsWith('start')) {
      const num = name.replace('start', '').replace('-', '');
      return `start-${num}`;
    }
    if (name.startsWith('stop')) {
      const num = name.replace('stop', '').replace('-', '');
      return `stop-${num}`;
    }
    if (name.startsWith('switch')) {
      const num = name.replace('switch', '').replace('-', '');
      return `switch-${num}`;
    }
    if (name.startsWith('track')) {
      const num = name.replace('track', '').replace('-', '');
      return `track-${num}`;
    }
    if (name.startsWith('point')) {
      const num = name.replace('point', '').replace('-', '');
      return `point-${num}`;
    }
    if (name.startsWith('exit')) {
      const num = name.replace('exit', '').replace('-', '');
      return `exit-${num}`;
    }

    return name;
  }

  /**
   * Formatta i nomi delle posizioni per renderli più leggibili - AGGIORNATA
   */
  private formatLocationName(location: string): string {
    if (!location) return location;

    if (location.startsWith('start-')) {
      return `Partenza ${location.replace('start-', '')}`;
    }
    if (location.startsWith('stop-')) {
      return `Fermata ${location.replace('stop-', '')}`;
    }
    if (location.startsWith('switch-')) {
      return `Scambio ${location.replace('switch-', '')}`;
    }
    if (location.startsWith('track-')) {
      return `Binario ${location.replace('track-', '')}`;
    }
    if (location.startsWith('point-')) {
      return `Punto ${location.replace('point-', '')}`;
    }
    if (location.startsWith('exit-')) {
      return `Uscita ${location.replace('exit-', '')}`;
    }
    return location;
  }

  /**
   * Resetta la cache (utile per test o ricaricamenti)
   */
  resetCache(): void {
    this.cachedEvents = [];
    this.cachedComments = [];
    this.cachedDestinations = [];
    this.trainFinalDestinations.clear();
  }
}
