import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// ────────────────────────────────────────────────────
// Tipi evento estratti dal piano
// ────────────────────────────────────────────────────
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

export type Event = ReleaseEv | MoveEv | TrackEv | SwitchEv;

// ────────────────────────────────────────────────────
// Interfaccia per i commenti dell'animazione
// ────────────────────────────────────────────────────
export interface AnimationComment {
  stepNumber: number;
  time: number;
  description: string;
  eventType: 'release' | 'move' | 'track' | 'switch';
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
   * Parsifica gli eventi dal testo del piano
   */
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

  /**
   * Estrae le destinazioni dei treni dal piano
   */
  private extractTrainDestinations(planText: string): void {
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
    this.cachedDestinations = Array.from(trainLastDestination.entries())
      .filter(([trainId, destination]) => destination.startsWith('stop-'))
      .map(([trainId, destination]) => ({
        trainId,
        destination: this.formatLocationName(destination),
        isArrived: false,
        isAnimating: false
      }));

    console.log('Destinazioni treni estratte:', this.cachedDestinations);
  }

  /**
   * Genera i commenti per l'animazione
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
   * Genera il testo del commento per un evento
   */
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

  /**
   * Normalizza i nomi delle posizioni
   */
  private normalizeLocationName(name: string): string {
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
    if (name.startsWith('exit')) {
      return `exit-${name.replace('exit', '')}`;
    }

    return name;
  }

  /**
   * Formatta i nomi delle posizioni per renderli più leggibili
   */
  private formatLocationName(location: string): string {
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
