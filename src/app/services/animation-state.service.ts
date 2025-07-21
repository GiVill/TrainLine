// ────────────────────────────────────────────────────
// animation-state.service.ts - Gestione stato dell'animazione
// ────────────────────────────────────────────────────
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Event, AnimationComment, TrainDestination } from './plan-parser.service';

@Injectable({
  providedIn: 'root'
})
export class AnimationStateService {
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
  private _events: Event[] = [];
  private _comments: AnimationComment[] = [];
  private trainDestinations: TrainDestination[] = [];
  private trainFinalDestinations = new Map<string, string>();

  // ────────── Getters ──────────
  get currentIdx(): number { return this.currentIdxSubject.value; }
  get isAnimating(): boolean { return this.isAnimatingSubject.value; }
  get currentComment(): AnimationComment | null { return this.currentCommentSubject.value; }
  get destinations(): TrainDestination[] { return this.trainDestinationsSubject.value; }
  get events(): Event[] { return this._events; }
  get comments(): AnimationComment[] { return this._comments; }

  /**
   * Inizializza lo stato
   */
  initialize(
    events: Event[],
    comments: AnimationComment[],
    destinations: TrainDestination[],
    finalDestinations: Map<string, string>
  ): void {
    this._events = events;
    this._comments = comments;
    this.trainDestinations = [...destinations];
    this.trainFinalDestinations = finalDestinations;
    this.trainDestinationsSubject.next([...destinations]);
  }

  /**
   * Resetta lo stato
   */
  reset(): void {
    this.currentIdxSubject.next(0);
    this.currentCommentSubject.next(null);

    // Reset stato destinazioni
    this.trainDestinations.forEach(dest => {
      dest.isArrived = false;
      dest.isAnimating = false;
    });
    this.trainDestinationsSubject.next([...this.trainDestinations]);
  }

  /**
   * Aggiorna l'indice corrente
   */
  setCurrentIdx(idx: number): void {
    this.currentIdxSubject.next(idx);
  }

  /**
   * Imposta lo stato di animazione
   */
  setAnimating(animating: boolean): void {
    this.isAnimatingSubject.next(animating);
  }

  /**
   * Aggiorna il commento corrente
   */
  setCurrentComment(comment: AnimationComment | null): void {
    this.currentCommentSubject.next(comment);
  }

  /**
   * Segna un treno come arrivato
   */
  markTrainAsArrived(trainId: string): void {
    const destinations = [...this.trainDestinations];
    const destination = destinations.find(d => d.trainId === trainId);

    if (destination) {
      destination.isArrived = true;
      destination.isAnimating = false;
      this.trainDestinationsSubject.next(destinations);
      console.log(`🎯 Treno ${trainId} è arrivato alla destinazione finale`);
    }
  }

  /**
   * Verifica se un treno ha raggiunto la destinazione finale
   */
  checkTrainDestination(trainId: string, position: string): boolean {
    const finalDestination = this.trainFinalDestinations.get(trainId);
    return finalDestination === position && position.startsWith('stop-');
  }

  /**
   * Verifica se l'animazione è completa
   */
  isComplete(): boolean {
    return this.currentIdx >= this._events.length;
  }

  /**
   * Ottiene le statistiche dello stato
   */
  getStats() {
    const arrivedCount = this.trainDestinations.filter(d => d.isArrived).length;

    return {
      totalEvents: this.events.length,
      processedEvents: this.currentIdx,
      totalDestinations: this.trainDestinations.length,
      arrivedTrains: arrivedCount
    };
  }
}
