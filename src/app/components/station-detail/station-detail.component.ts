import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { Station } from '../../model/models';
import { AnimationComment, PlanParserService, TrainDestination } from '../../services/plan-parser.service';
import { SvgManagerService } from '../../services/svg-manager.service';
import { TrainAnimationService } from '../../services/train-animation.service';

@Component({
  selector: 'app-station-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.css'],
})
export class StationDetailComponent implements OnInit, OnDestroy {
  // ────────── Input ──────────
  @Input() station!: {
    stop_name: string;
    zone_id: string;
    stop_lat: number;
    stop_lon: number
  };

  // ────────── State ──────────
  expanded = false;
  private initialized = false;
  private destroy$ = new Subject<void>();

  // ────────── Observable state - ora gestito dal TrainAnimationService ──────────
  currentIdx = 0;
  isAnimating = false;
  currentComment: AnimationComment | null = null;
  trainDestinations: TrainDestination[] = [];
  animationComments: AnimationComment[] = [];

  // ────────── Animation stats (opzionale) ──────────
  animationStats = {
    totalEvents: 0,
    processedEvents: 0,
    activeAnimations: 0,
    totalTrains: 0,
    arrivedTrains: 0,
    currentTime: 0
  };

  // ────────── SVG Reference ──────────
  @ViewChild('mapObject', { static: false }) mapObject!: ElementRef<HTMLObjectElement>;

  constructor(
    private planParser: PlanParserService,
    private svgManager: SvgManagerService,
    private trainAnimation: TrainAnimationService
  ) {}

  ngOnInit(): void {
    this.subscribeToAnimationState();
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.trainAnimation.stop();
  }

  // ────────── Subscription management ──────────
  private subscribeToAnimationState(): void {
    // Sottoscrizione agli osservabili del servizio di animazione
    this.trainAnimation.currentIdx$
      .pipe(takeUntil(this.destroy$))
      .subscribe(idx => {
        this.currentIdx = idx;
        this.updateAnimationStats();
      });

    this.trainAnimation.isAnimating$
      .pipe(takeUntil(this.destroy$))
      .subscribe(animating => {
        this.isAnimating = animating;
        this.updateAnimationStats();
      });

    this.trainAnimation.currentComment$
      .pipe(takeUntil(this.destroy$))
      .subscribe(comment => this.currentComment = comment);

    this.trainAnimation.trainDestinations$
      .pipe(takeUntil(this.destroy$))
      .subscribe(destinations => {
        this.trainDestinations = destinations;
        this.updateAnimationStats();
      });
  }

  private setupEventListeners(): void {
    // Event listener per apertura dettagli stazione da componenti esterni
    window.addEventListener('openStationDetail', (e: any) => {
      const st: Station = e.detail;
      if (st.stop_name === this.station.stop_name) {
        this.expanded = true;
        // Avvia automaticamente l'animazione se già inizializzata
        if (this.initialized) {
          this.startAnimation();
        }
      }
    });
  }

  // ────────── UI Controls ──────────
  toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  isExpanded(): boolean {
    return this.expanded;
  }

  // ────────── Animation Controls ──────────
  startAnimation(): void {
    if (!this.initialized) {
      console.warn('Animazione non inizializzata');
      return;
    }
    this.trainAnimation.start();
  }

  stopAnimation(): void {
    this.trainAnimation.stop();
  }

  resetAnimation(): void {
    this.trainAnimation.reset();
    this.updateAnimationStats();
  }

  // ────────── Animation speed controls (bonus) ──────────
  increaseSpeed(): void {
    const currentSpeed = this.trainAnimation.getSimulationSpeed();
    this.trainAnimation.setSimulationSpeed(currentSpeed + 0.5);
  }

  decreaseSpeed(): void {
    const currentSpeed = this.trainAnimation.getSimulationSpeed();
    this.trainAnimation.setSimulationSpeed(currentSpeed - 0.5);
  }

  getCurrentSpeed(): number {
    return this.trainAnimation.getSimulationSpeed();
  }

  // ────────── SVG Loading and Initialization ──────────
  async onSvgLoad(): Promise<void> {
    if (this.station.stop_name !== 'Stazione di CAGLIARI') return;

    try {
      console.log('Inizializzazione componente stazione...');

      // 1. Inizializza il manager SVG
      const svgDoc = this.mapObject.nativeElement.contentDocument;
      if (!svgDoc) {
        throw new Error('Impossibile accedere al documento SVG');
      }

      this.svgManager.initialize(svgDoc);
      console.log('✅ SVG Manager inizializzato');

      // 2. Carica e parsa il piano
      const planData = await this.planParser.loadAndParsePlan();

      if (!planData) {
        throw new Error('Impossibile caricare il piano');
      }

      console.log('✅ Piano caricato:', {
        eventi: planData.events.length,
        commenti: planData.comments.length,
        destinazioni: planData.destinations.length
      });

      // 3. Salva i commenti localmente per la UI
      this.animationComments = planData.comments;

      // 4. Inizializza il servizio di animazione
      this.trainAnimation.initialize(
        planData.events,
        planData.comments,
        planData.destinations,
        planData.finalDestinations
      );

      console.log('✅ Train Animation Service inizializzato');

      this.initialized = true;
      this.updateAnimationStats();

      console.log('🎉 Componente inizializzato con successo');

    } catch (error) {
      console.error('❌ Errore durante l\'inizializzazione:', error);
      this.handleInitializationError(error);
    }
  }

  // ────────── Error handling ──────────
  private handleInitializationError(error: any): void {
    // Potresti implementare una notifica di errore per l'utente
    console.error('Dettagli errore inizializzazione:', error);

    // Reset dello stato in caso di errore
    this.initialized = false;
    this.animationComments = [];
    this.trainDestinations = [];
  }

  // ────────── Stats and monitoring ──────────
  private updateAnimationStats(): void {
    if (this.initialized) {
      this.animationStats = this.trainAnimation.getAnimationStats();
    }
  }

  // ────────── Utility methods for template ──────────
  getProgressPercentage(): number {
    if (this.animationStats.totalEvents === 0) return 0;
    return Math.round((this.animationStats.processedEvents / this.animationStats.totalEvents) * 100);
  }

  isAnimationComplete(): boolean {
    return this.trainAnimation.isAnimationComplete();
  }

  getArrivedTrainsCount(): number {
    return this.trainDestinations.filter(d => d.isArrived).length;
  }

  getTotalTrainsCount(): number {
    return this.trainDestinations.length;
  }

  formatTime(time: number): string {
    return `${time.toFixed(1)}s`;
  }

  // ────────── Debug methods (rimuovere in produzione) ──────────
  debugLogState(): void {
    console.log('=== DEBUG STATE ===');
    console.log('Initialized:', this.initialized);
    console.log('Expanded:', this.expanded);
    console.log('Current Index:', this.currentIdx);
    console.log('Is Animating:', this.isAnimating);
    console.log('Animation Stats:', this.animationStats);
    console.log('Train Destinations:', this.trainDestinations);
    console.log('==================');
  }
}
