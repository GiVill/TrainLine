// ────────────────────────────────────────────────────
// animation-loop.service.ts - Gestione loop animazione
// ────────────────────────────────────────────────────
import { Injectable } from '@angular/core';
import { SvgManagerService } from './svg-manager.service';
import { TrainManagerService } from './train-manager.service';
import { EventProcessorService } from './event-processor.service';
import { AnimationStateService } from './animation-state.service';

@Injectable({
  providedIn: 'root'
})
export class AnimationLoopService {
  private rafId: number | null = null;
  private animationStartTime: number = 0;
  private currentAnimationTime: number = 0;
  private simulationSpeed = 1;

  constructor(
    private svgManager: SvgManagerService,
    private trainManager: TrainManagerService,
    private eventProcessor: EventProcessorService,
    private animationState: AnimationStateService
  ) {}

  /**
   * Inizializza il servizio
   */
  initialize(): void {
    this.currentAnimationTime = 0;
  }

  /**
   * Verifica se l'animazione può partire
   */
  canStart(): boolean {
    return this.svgManager.isInitialized() && !this.animationState.isAnimating;
  }

  /**
   * Avvia il loop dell'animazione
   */
  start(): void {
    this.animationStartTime = performance.now();
    this.currentAnimationTime = 0;
    this.animationLoop();
  }

  /**
   * Ferma il loop dell'animazione
   */
  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Loop principale dell'animazione
   */
  private animationLoop(): void {
    if (!this.animationState.isAnimating) return;

    const now = performance.now();
    this.currentAnimationTime = (now - this.animationStartTime) / 1000 * this.simulationSpeed;

    this.eventProcessor.processEvents(this.currentAnimationTime);
    this.trainManager.updateAnimations(this.currentAnimationTime);

    this.rafId = requestAnimationFrame(() => this.animationLoop());
  }

  /**
   * Imposta la velocità di simulazione
   */
  setSimulationSpeed(speed: number): void {
    this.simulationSpeed = Math.max(0.1, Math.min(10, speed));
  }

  /**
   * Ottiene la velocità di simulazione
   */
  getSimulationSpeed(): number {
    return this.simulationSpeed;
  }

  /**
   * Ottiene il tempo corrente dell'animazione
   */
  getCurrentTime(): number {
    return this.currentAnimationTime;
  }
}
