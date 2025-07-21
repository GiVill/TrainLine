// ────────────────────────────────────────────────────
// train-animation.service.ts - Servizio principale orchestratore
// ────────────────────────────────────────────────────
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AnimationStateService } from './animation-state.service';
import { TrainManagerService } from './train-manager.service';
import { EventProcessorService } from './event-processor.service';
import { AnimationLoopService } from './animation-loop.service';
import { Event, AnimationComment, TrainDestination } from './plan-parser.service';

@Injectable({
  providedIn: 'root'
})
export class TrainAnimationService {
  constructor(
    private animationState: AnimationStateService,
    private trainManager: TrainManagerService,
    private eventProcessor: EventProcessorService,
    private animationLoop: AnimationLoopService
  ) {}

  // Espone gli observables dei servizi interni
  public get currentIdx$() { return this.animationState.currentIdx$; }
  public get isAnimating$() { return this.animationState.isAnimating$; }
  public get currentComment$() { return this.animationState.currentComment$; }
  public get trainDestinations$() { return this.animationState.trainDestinations$; }

  // ────────── Getters per lo stato corrente ──────────
  get currentIdx(): number { return this.animationState.currentIdx; }
  get isAnimating(): boolean { return this.animationState.isAnimating; }
  get currentComment(): AnimationComment | null { return this.animationState.currentComment; }
  get destinations(): TrainDestination[] { return this.animationState.destinations; }

  /**
   * Inizializza il servizio con i dati del piano
   */
  initialize(
    events: Event[],
    comments: AnimationComment[],
    destinations: TrainDestination[],
    finalDestinations: Map<string, string>
  ): void {
    console.log('TrainAnimationService inizializzato');

    this.animationState.initialize(events, comments, destinations, finalDestinations);
    this.trainManager.initialize(finalDestinations);
    this.eventProcessor.initialize(events, comments);
    this.animationLoop.initialize();
  }

  /**
   * Avvia l'animazione
   */
  start(): void {
    if (!this.animationLoop.canStart()) {
      console.warn('Impossibile avviare animazione');
      return;
    }

    console.log('Avvio animazione...');
    this.animationState.setAnimating(true);
    this.animationLoop.start();
  }

  /**
   * Ferma l'animazione
   */
  stop(): void {
    console.log('Arresto animazione...');
    this.animationState.setAnimating(false);
    this.animationLoop.stop();
    this.trainManager.clearActiveAnimations();
  }

  /**
   * Resetta l'animazione allo stato iniziale
   */
  reset(): void {
    console.log('Reset animazione...');
    this.stop();
    this.animationState.reset();
    this.trainManager.reset();
  }

  // ────────── Metodi di configurazione ──────────
  setSimulationSpeed(speed: number): void {
    this.animationLoop.setSimulationSpeed(speed);
  }

  getSimulationSpeed(): number {
    return this.animationLoop.getSimulationSpeed();
  }

  // ────────── Metodi di stato ──────────
  isAnimationComplete(): boolean {
    return this.animationState.isComplete() && !this.trainManager.hasActiveAnimations();
  }

  getAnimationStats() {
    return {
      ...this.animationState.getStats(),
      ...this.trainManager.getStats(),
      currentTime: this.animationLoop.getCurrentTime()
    };
  }
}
