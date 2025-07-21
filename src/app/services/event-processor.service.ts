// ────────────────────────────────────────────────────
// event-processor.service.ts - Processamento eventi AGGIORNATO
// ────────────────────────────────────────────────────
import { Injectable } from '@angular/core';
import { SvgManagerService } from './svg-manager.service';
import { TrainManagerService } from './train-manager.service';
import { AnimationStateService } from './animation-state.service';
import {
  Event,
  StartTrainEv,
  MoveTrainEv,
  MoveThroughSwitchEv,
  SwitchTrackEv,
  ReserveTrackEv,
  ReleaseEv,
  MoveEv,
  TrackEv,
  SwitchEv,
  AnimationComment
} from './plan-parser.service';

@Injectable({
  providedIn: 'root'
})
export class EventProcessorService {
  private events: Event[] = [];
  private comments: AnimationComment[] = [];

  constructor(
    private svgManager: SvgManagerService,
    private trainManager: TrainManagerService,
    private animationState: AnimationStateService
  ) {}

  /**
   * Inizializza il processore
   */
  initialize(events: Event[], comments: AnimationComment[]): void {
    this.events = events;
    this.comments = comments;
  }

  /**
   * Processa gli eventi per il tempo corrente
   */
  processEvents(currentTime: number): void {
    let currentIdx = this.animationState.currentIdx;

    while (currentIdx < this.events.length) {
      const event = this.events[currentIdx];

      if (event.at > currentTime) {
        break; // Eventi futuri
      }

      console.log(`Processando evento ${currentIdx + 1}/${this.events.length}:`, event);

      // Aggiorna il commento corrente
      if (currentIdx < this.comments.length) {
        this.animationState.setCurrentComment(this.comments[currentIdx]);
      }

      this.processEvent(event, currentTime);

      currentIdx++;
      this.animationState.setCurrentIdx(currentIdx);
    }
  }

  /**
   * Processa un singolo evento
   */
  private processEvent(event: Event, currentTime: number): void {
    switch (event.kind) {
      case 'start-train':
        this.handleStartTrainEvent(event);
        break;
      case 'move-train':
        this.handleMoveTrainEvent(event, currentTime);
        break;
      case 'move-through-switch':
        this.handleMoveThroughSwitchEvent(event, currentTime);
        break;
      case 'switch-track':
        this.handleSwitchTrackEvent(event);
        break;
      case 'reserve-track':
        this.handleReserveTrackEvent(event);
        break;
      // Mantieni retrocompatibilità
      case 'release':
        this.handleReleaseEvent(event);
        break;
      case 'move':
        this.handleMoveEvent(event, currentTime);
        break;
      case 'track':
        this.handleTrackEvent(event);
        break;
      case 'switch':
        this.handleSwitchEvent(event);
        break;
    }
  }

  /**
   * Gestisce eventi START-TRAIN
   */
  private handleStartTrainEvent(event: StartTrainEv): void {
    console.log(`🚂 START-TRAIN ${event.train} da ${event.startLocation} con percorso: ${event.path.join(' → ')}`);

    // Posiziona il treno alla posizione iniziale
    this.trainManager.positionTrain(event.train, event.startLocation);

    // Se il percorso ha più di una posizione, avvia l'animazione verso la prossima
    if (event.path.length > 1) {
      const nextPosition = event.path[1];
      console.log(`Avvio movimento automatico verso ${nextPosition}`);
      this.trainManager.startAnimation(event.train, event.startLocation, nextPosition, event.duration, event.at);
    }
  }

  /**
   * Gestisce eventi MOVE-TRAIN
   */
  private handleMoveTrainEvent(event: MoveTrainEv, currentTime: number): void {
    console.log(`🚊 MOVE-TRAIN ${event.train}: ${event.from} → ${event.to} (durata: ${event.duration}s)`);

    // Se il treno non è già nella posizione from, posizionalo prima
    this.trainManager.ensureTrainPosition(event.train, event.from);

    // Avvia l'animazione
    this.trainManager.startAnimation(event.train, event.from, event.to, event.duration, currentTime);
  }

  /**
   * Gestisce eventi MOVE-THROUGH-SWITCH
   */
  private handleMoveThroughSwitchEvent(event: MoveThroughSwitchEv, currentTime: number): void {
    console.log(`🔀 MOVE-THROUGH-SWITCH ${event.train} attraverso percorso: ${event.path.join(' → ')}`);

    if (event.path.length < 2) {
      console.warn('Percorso attraverso switch troppo corto');
      return;
    }

    // Posiziona il treno alla posizione iniziale se necessario
    this.trainManager.ensureTrainPosition(event.train, event.startLocation);

    // Avvia animazione complessa attraverso il percorso
    this.trainManager.startComplexAnimation(event.train, event.path, event.duration, currentTime);
  }

  /**
   * Gestisce eventi SWITCH-TRACK
   */
  private handleSwitchTrackEvent(event: SwitchTrackEv): void {
    console.log(`⚙️ SWITCH-TRACK ${event.switch}: ${event.fromTrack} → ${event.toTrack}`);

    // Aggiorna la configurazione dello switch
    this.svgManager.updateSwitchConfiguration(event.switch, event.fromTrack, event.toTrack);

    // Aggiorna lo stato dei binari coinvolti
    event.tracks.forEach(track => {
      this.svgManager.highlightTrack(track, 'switch-active');
    });

    // Programma la rimozione dell'evidenziazione dopo la durata
    setTimeout(() => {
      event.tracks.forEach(track => {
        this.svgManager.removeTrackHighlight(track);
      });
    }, event.duration * 1000);
  }

  /**
   * Gestisce eventi RESERVE-TRACK
   */
  private handleReserveTrackEvent(event: ReserveTrackEv): void {
    console.log(`🔒 RESERVE-TRACK ${event.train} riserva ${event.track}`);

    // Evidenzia il binario come riservato
    this.svgManager.highlightTrack(event.track, 'reserved');

    // Programma la rimozione della prenotazione
    setTimeout(() => {
      this.svgManager.removeTrackHighlight(event.track);
    }, event.duration * 1000);
  }

  /**
   * Gestisce eventi di rilascio (retrocompatibilità)
   */
  private handleReleaseEvent(event: ReleaseEv): void {
    console.log(`Rilascio treno ${event.tr} alla posizione ${event.loc}`);
    this.trainManager.positionTrain(event.tr, event.loc);
  }

  /**
   * Gestisce eventi di movimento (retrocompatibilità)
   */
  private handleMoveEvent(event: MoveEv, currentTime: number): void {
    console.log(`Movimento treno ${event.tr}: ${event.from} → ${event.to} (durata: ${event.duration}s)`);
    this.trainManager.startAnimation(event.tr, event.from, event.to, event.duration, currentTime);
  }

  /**
   * Gestisce eventi di track (retrocompatibilità)
   */
  private handleTrackEvent(event: TrackEv): void {
    console.log(`Track ${event.a}-${event.b}: ${event.status}`);
    this.svgManager.updateTrackStatus(event.a, event.b, event.status);
  }

  /**
   * Gestisce eventi di switch (retrocompatibilità)
   */
  private handleSwitchEvent(event: SwitchEv): void {
    console.log(`Switch ${event.switch}: ${event.status}`);
    this.svgManager.updateSwitchStatus(event.switch, event.status);
  }

  /**
   * Ottiene statistiche del processore
   */
  getStats() {
    const eventsByType = this.events.reduce((acc, event) => {
      acc[event.kind] = (acc[event.kind] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEvents: this.events.length,
      eventsByType,
      currentIndex: this.animationState.currentIdx
    };
  }
}
