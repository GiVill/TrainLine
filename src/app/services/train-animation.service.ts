import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SvgManagerService } from './svg-manager.service';
import { Event, ReleaseEv, MoveEv, TrackEv, SwitchEv, AnimationComment, TrainDestination } from './plan-parser.service';

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

@Injectable({
  providedIn: 'root'
})
export class TrainAnimationService {
  // ────────── State observables ──────────
  private currentIdxSubject = new BehaviorSubject<number>(0);
  private isAnimatingSubject = new BehaviorSubject<boolean>(false);
  private currentCommentSubject = new BehaviorSubject<AnimationComment | null>(null);
  private trainDestinationsSubject = new BehaviorSubject<TrainDestination[]>([]);

  public currentIdx$ = this.currentIdxSubject.asObservable();
  public isAnimating$ = this.isAnimatingSubject.asObservable();
  public currentComment$ = this.currentCommentSubject.asObservable();
  public trainDestinations$ = this.trainDestinationsSubject.asObservable();

  // ────────── Private state ──────────
  private events: Event[] = [];
  private comments: AnimationComment[] = [];
  private trainDestinations: TrainDestination[] = [];
  private trainFinalDestinations = new Map<string, string>();

  private rafId: number | null = null;
  private animationStartTime: number = 0;
  private currentAnimationTime: number = 0;
  private simulationSpeed = 5;

  private trainImgs = new Map<string, SVGImageElement>();
  private activeAnimations = new Map<string, ActiveAnimation>();
  private trainCurrentPositions = new Map<string, string>();
  private trainOrder: string[] = [];

  private trainColors = ['treno_grigio.png', 'treno_rosso.png', 'treno_blu.png'];

  constructor(private svgManager: SvgManagerService) {}

  // ────────── Getters per lo stato corrente ──────────
  get currentIdx(): number {
    return this.currentIdxSubject.value;
  }

  get isAnimating(): boolean {
    return this.isAnimatingSubject.value;
  }

  get currentComment(): AnimationComment | null {
    return this.currentCommentSubject.value;
  }

  get destinations(): TrainDestination[] {
    return this.trainDestinationsSubject.value;
  }

  /**
   * Inizializza il servizio con i dati del piano
   */
  initialize(
    events: Event[],
    comments: AnimationComment[],
    destinations: TrainDestination[],
    finalDestinations: Map<string, string>
  ): void {
    console.log('TrainAnimationService inizializzato con:', {
      events: events.length,
      comments: comments.length,
      destinations: destinations.length
    });

    this.events = events;
    this.comments = comments;
    this.trainDestinations = [...destinations];
    this.trainFinalDestinations = finalDestinations;
    this.trainDestinationsSubject.next([...destinations]);

    this.reset();
  }

  /**
   * Avvia l'animazione
   */
  start(): void {
    if (!this.svgManager.isInitialized() || this.isAnimating) {
      console.warn('Impossibile avviare animazione: SVG non inizializzato o animazione già in corso');
      return;
    }

    console.log('Avvio animazione...');
    this.isAnimatingSubject.next(true);
    this.animationStartTime = performance.now();
    this.currentAnimationTime = 0;
    this.animationLoop();
  }

  /**
   * Ferma l'animazione
   */
  stop(): void {
    console.log('Arresto animazione...');
    this.isAnimatingSubject.next(false);

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    this.activeAnimations.clear();
  }

  /**
   * Resetta l'animazione allo stato iniziale
   */
  reset(): void {
    console.log('Reset animazione...');
    this.stop();

    this.currentIdxSubject.next(0);
    this.currentCommentSubject.next(null);
    this.currentAnimationTime = 0;

    // Reset stato destinazioni
    this.trainDestinations.forEach(dest => {
      dest.isArrived = false;
      dest.isAnimating = false;
    });
    this.trainDestinationsSubject.next([...this.trainDestinations]);

    // Reset posizioni e ordine treni
    this.trainCurrentPositions.clear();
    this.trainOrder = [];

    // Rimuove i treni dal DOM
    this.trainImgs.forEach(img => this.svgManager.removeImage(img));
    this.trainImgs.clear();
    this.activeAnimations.clear();

    // Reset SVG
    this.svgManager.reset();
  }

  /**
   * Loop principale dell'animazione
   */
  private animationLoop(): void {
    if (!this.isAnimating) return;

    const now = performance.now();
    this.currentAnimationTime = (now - this.animationStartTime) / 1000 * this.simulationSpeed;

    this.processEvents();
    this.updateActiveAnimations();

    this.rafId = requestAnimationFrame(() => this.animationLoop());
  }

  /**
   * Processa gli eventi che dovrebbero essere attivi al momento corrente
   */
  private processEvents(): void {
    let currentIdx = this.currentIdxSubject.value;

    while (currentIdx < this.events.length) {
      const event = this.events[currentIdx];

      if (event.at > this.currentAnimationTime) {
        break; // Eventi futuri, aspetta
      }

      console.log(`Processando evento ${currentIdx + 1}/${this.events.length}:`, event);

      // Aggiorna il commento corrente
      if (currentIdx < this.comments.length) {
        this.currentCommentSubject.next(this.comments[currentIdx]);
      }

      switch (event.kind) {
        case 'release':
          this.handleReleaseEvent(event);
          break;
        case 'move':
          this.handleMoveEvent(event);
          break;
        case 'track':
          this.handleTrackEvent(event);
          break;
        case 'switch':
          this.handleSwitchEvent(event);
          break;
      }

      // IMPORTANTE: Incrementa l'indice DOPO aver processato l'evento
      currentIdx++;
      this.currentIdxSubject.next(currentIdx);
    }
  }

  /**
   * Gestisce un evento di rilascio treno
   */
  private handleReleaseEvent(event: ReleaseEv): void {
    console.log(`Rilascio treno ${event.tr} alla posizione ${event.loc}`);

    const img = this.getTrain(event.tr);
    const loc = this.svgManager.getElementById(event.loc);

    if (loc) {
      const pos = this.svgManager.center(loc);
      this.svgManager.positionImage(img, pos.x, pos.y);
      this.updateTrainPosition(event.tr, event.loc);
      console.log(`✅ Treno ${event.tr} rilasciato alla posizione (${pos.x}, ${pos.y})`);
    } else {
      console.error(`❌ Elemento SVG non trovato per posizione: ${event.loc}`);
    }
  }

  /**
   * Gestisce un evento di movimento treno
   */
  private handleMoveEvent(event: MoveEv): void {
    console.log(`Movimento treno ${event.tr}: ${event.from} → ${event.to} (durata: ${event.duration}s)`);

    const img = this.getTrain(event.tr);
    const from = this.svgManager.getElementById(event.from);
    const to = this.svgManager.getElementById(event.to);

    if (!(from && to)) {
      console.error(`❌ Elementi SVG non trovati per movimento: ${event.from} → ${event.to}`);
      return;
    }

    const startPos = this.svgManager.center(from);
    const endPos = this.svgManager.center(to);

    this.activeAnimations.set(event.tr, {
      trainId: event.tr,
      startTime: this.currentAnimationTime,
      endTime: this.currentAnimationTime + event.duration,
      fromElement: from,
      toElement: to,
      startPos: startPos,
      endPos: endPos,
      img: img
    });

    console.log(`✅ Animazione movimento avviata per treno ${event.tr}`);
  }

  /**
   * Gestisce un evento di track
   */
  private handleTrackEvent(event: TrackEv): void {
    console.log(`Track ${event.a}-${event.b}: ${event.status}`);
    this.svgManager.updateTrackStatus(event.a, event.b, event.status);
  }

  /**
   * Gestisce un evento di switch
   */
  private handleSwitchEvent(event: SwitchEv): void {
    console.log(`Switch ${event.switch}: ${event.status}`);
    this.svgManager.updateSwitchStatus(event.switch, event.status);
  }

  /**
   * Aggiorna le animazioni attive
   */
  private updateActiveAnimations(): void {
    const completedAnimations: string[] = [];

    this.activeAnimations.forEach((animation, trainId) => {
      const progress = Math.min(
        (this.currentAnimationTime - animation.startTime) / (animation.endTime - animation.startTime),
        1
      );

      if (progress >= 1) {
        // Animazione completata
        this.svgManager.positionImage(animation.img, animation.endPos.x, animation.endPos.y);

        // Trova l'evento di movimento corrispondente
        const moveEvent = this.events.find(e =>
          e.kind === 'move' &&
          e.tr === trainId &&
          Math.abs(e.at - animation.startTime) < 0.1
        ) as MoveEv;

        if (moveEvent) {
          this.updateTrainPosition(trainId, moveEvent.to);
          console.log(`✅ Treno ${trainId} arrivato alla posizione ${moveEvent.to}`);
        }

        completedAnimations.push(trainId);
      } else {
        // Aggiorna posizione interpolata
        const currentX = animation.startPos.x + (animation.endPos.x - animation.startPos.x) * progress;
        const currentY = animation.startPos.y + (animation.endPos.y - animation.startPos.y) * progress;

        this.svgManager.positionImage(animation.img, currentX, currentY);
      }
    });

    // Rimuovi animazioni completate
    completedAnimations.forEach(trainId => {
      this.activeAnimations.delete(trainId);
    });
  }

  /**
   * Ottiene o crea l'immagine di un treno
   */
  private getTrain(trainId: string): SVGImageElement {
    const cached = this.trainImgs.get(trainId);
    if (cached) return cached;

    // Determina l'indice del treno nell'ordine di apparizione
    let trainIndex = this.trainOrder.indexOf(trainId);
    if (trainIndex === -1) {
      this.trainOrder.push(trainId);
      trainIndex = this.trainOrder.length - 1;
    }

    // Seleziona il colore del treno basato sull'indice
    const colorIndex = trainIndex % this.trainColors.length;
    const trainImagePath = `${this.trainColors[colorIndex]}`;

    const img = this.svgManager.createTrainImage(trainImagePath);
    this.trainImgs.set(trainId, img);

    console.log(`✅ Creato treno ${trainId} con colore ${this.trainColors[colorIndex]}`);

    return img;
  }

  /**
   * Aggiorna la posizione corrente di un treno
   */
  private updateTrainPosition(trainId: string, newPosition: string): void {
    this.trainCurrentPositions.set(trainId, newPosition);

    // Controlla se il treno ha raggiunto la destinazione finale
    const finalDestination = this.trainFinalDestinations.get(trainId);
    if (finalDestination && finalDestination === newPosition && newPosition.startsWith('stop-')) {
      this.markTrainAsArrived(trainId);
    }
  }

  /**
   * Segna un treno come arrivato alla destinazione finale
   */
  private markTrainAsArrived(trainId: string): void {
    const destinations = [...this.trainDestinations];
    const destination = destinations.find(d => d.trainId === trainId);

    if (destination) {
      destination.isArrived = true;
      destination.isAnimating = false;
      this.trainDestinationsSubject.next(destinations);

      console.log(`🎯 Treno ${trainId} è arrivato alla destinazione finale: ${destination.destination}`);
    }
  }

  /**
   * Imposta la velocità di simulazione
   */
  setSimulationSpeed(speed: number): void {
    this.simulationSpeed = Math.max(0.1, Math.min(10, speed));
  }

  /**
   * Ottiene la velocità di simulazione corrente
   */
  getSimulationSpeed(): number {
    return this.simulationSpeed;
  }

  /**
   * Verifica se l'animazione è terminata
   */
  isAnimationComplete(): boolean {
    return this.currentIdxSubject.value >= this.events.length && this.activeAnimations.size === 0;
  }

  /**
   * Ottiene le statistiche dell'animazione
   */
  getAnimationStats(): {
    totalEvents: number;
    processedEvents: number;
    activeAnimations: number;
    totalTrains: number;
    arrivedTrains: number;
    currentTime: number;
  } {
    const arrivedCount = this.trainDestinations.filter(d => d.isArrived).length;

    return {
      totalEvents: this.events.length,
      processedEvents: this.currentIdxSubject.value,
      activeAnimations: this.activeAnimations.size,
      totalTrains: this.trainOrder.length,
      arrivedTrains: arrivedCount,
      currentTime: this.currentAnimationTime
    };
  }
}
