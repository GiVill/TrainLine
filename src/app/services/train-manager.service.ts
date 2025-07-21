// ────────────────────────────────────────────────────
// train-manager.service.ts - Gestione treni e animazioni AGGIORNATO
// ────────────────────────────────────────────────────
import { Injectable } from '@angular/core';
import { SvgManagerService } from './svg-manager.service';
import { AnimationStateService } from './animation-state.service';

interface ActiveAnimation {
  trainId: string;
  startTime: number;
  endTime: number;
  fromElement: SVGGraphicsElement;
  toElement: SVGGraphicsElement;
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  img: SVGImageElement;
  animationType: 'simple' | 'complex';
}

interface ComplexAnimation extends ActiveAnimation {
  animationType: 'complex';
  path: string[];
  currentSegment: number;
  segmentDuration: number;
}

@Injectable({
  providedIn: 'root'
})
export class TrainManagerService {
  private trainImgs = new Map<string, SVGImageElement>();
  private activeAnimations = new Map<string, ActiveAnimation>();
  private trainCurrentPositions = new Map<string, string>();
  private trainOrder: string[] = [];
  private trainFinalDestinations = new Map<string, string>();

  private trainColors = ['treno_grigio.png', 'treno_rosso.png', 'treno_blu.png'];

  constructor(
    private svgManager: SvgManagerService,
    private animationState: AnimationStateService
  ) {}

  /**
   * Inizializza il manager
   */
  initialize(finalDestinations: Map<string, string>): void {
    this.trainFinalDestinations = finalDestinations;
  }

  /**
   * Resetta il manager
   */
  reset(): void {
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
   * Ottiene o crea l'immagine di un treno
   */
  getTrain(trainId: string): SVGImageElement {
    const cached = this.trainImgs.get(trainId);
    if (cached) return cached;

    let trainIndex = this.trainOrder.indexOf(trainId);
    if (trainIndex === -1) {
      this.trainOrder.push(trainId);
      trainIndex = this.trainOrder.length - 1;
    }

    const colorIndex = trainIndex % this.trainColors.length;
    const trainImagePath = this.trainColors[colorIndex];

    const img = this.svgManager.createTrainImage(trainImagePath);
    this.trainImgs.set(trainId, img);

    console.log(`✅ Creato treno ${trainId} con colore ${this.trainColors[colorIndex]}`);
    return img;
  }

  /**
   * Posiziona un treno
   */
  positionTrain(trainId: string, locationId: string): void {
    const img = this.getTrain(trainId);
    const loc = this.svgManager.getElementById(locationId);

    if (loc) {
      const pos = this.svgManager.center(loc);
      this.svgManager.positionImage(img, pos.x, pos.y);
      this.updateTrainPosition(trainId, locationId);
      console.log(`✅ Treno ${trainId} posizionato a ${locationId} (${pos.x}, ${pos.y})`);
    } else {
      console.error(`❌ Elemento SVG non trovato: ${locationId}`);
    }
  }

  /**
   * Assicura che un treno sia nella posizione specificata
   */
  ensureTrainPosition(trainId: string, locationId: string): void {
    const currentPosition = this.trainCurrentPositions.get(trainId);
    if (currentPosition !== locationId) {
      console.log(`📍 Posizionamento forzato treno ${trainId} da ${currentPosition || 'sconosciuta'} a ${locationId}`);
      this.positionTrain(trainId, locationId);
    }
  }

  /**
   * Avvia un'animazione di movimento semplice
   */
  startAnimation(trainId: string, from: string, to: string, duration: number, startTime: number): void {
    const img = this.getTrain(trainId);
    const fromEl = this.svgManager.getElementById(from);
    const toEl = this.svgManager.getElementById(to);

    if (!(fromEl && toEl)) {
      console.error(`❌ Elementi SVG non trovati per movimento: ${from} → ${to}`);
      return;
    }

    const startPos = this.svgManager.center(fromEl);
    const endPos = this.svgManager.center(toEl);

    // Cancella eventuali animazioni precedenti per questo treno
    if (this.activeAnimations.has(trainId)) {
      console.log(`⚠️ Cancellazione animazione precedente per treno ${trainId}`);
      this.activeAnimations.delete(trainId);
    }

    this.activeAnimations.set(trainId, {
      trainId,
      startTime,
      endTime: startTime + duration,
      fromElement: fromEl,
      toElement: toEl,
      startPos,
      endPos,
      img,
      animationType: 'simple'
    });

    console.log(`✅ Animazione semplice avviata per treno ${trainId}: ${from} → ${to} (${duration}s)`);
  }

  /**
   * Avvia un'animazione complessa attraverso un percorso
   */
  startComplexAnimation(trainId: string, path: string[], totalDuration: number, startTime: number): void {
    if (path.length < 2) {
      console.error(`❌ Percorso troppo corto per animazione complessa: ${path.join(' → ')}`);
      return;
    }

    const img = this.getTrain(trainId);
    const segmentDuration = totalDuration / (path.length - 1);

    // Inizia dalla prima posizione del percorso
    const firstEl = this.svgManager.getElementById(path[0]);
    const secondEl = this.svgManager.getElementById(path[1]);

    if (!(firstEl && secondEl)) {
      console.error(`❌ Elementi SVG non trovati per inizio percorso complesso: ${path[0]} → ${path[1]}`);
      return;
    }

    const startPos = this.svgManager.center(firstEl);
    const firstEndPos = this.svgManager.center(secondEl);

    const complexAnimation: ComplexAnimation = {
      trainId,
      startTime,
      endTime: startTime + segmentDuration,
      fromElement: firstEl,
      toElement: secondEl,
      startPos,
      endPos: firstEndPos,
      img,
      animationType: 'complex',
      path,
      currentSegment: 0,
      segmentDuration
    };

    // Cancella eventuali animazioni precedenti
    if (this.activeAnimations.has(trainId)) {
      this.activeAnimations.delete(trainId);
    }

    this.activeAnimations.set(trainId, complexAnimation);
    console.log(`✅ Animazione complessa avviata per treno ${trainId}: ${path.join(' → ')} (${totalDuration}s totali)`);
  }

  /**
   * Aggiorna le animazioni attive
   */
  updateAnimations(currentTime: number): void {
    const completedAnimations: string[] = [];
    const updatedAnimations = new Map<string, ActiveAnimation>();

    this.activeAnimations.forEach((animation, trainId) => {
      if (animation.animationType === 'simple') {
        this.updateSimpleAnimation(animation, currentTime, completedAnimations);
        if (!completedAnimations.includes(trainId)) {
          updatedAnimations.set(trainId, animation);
        }
      } else if (animation.animationType === 'complex') {
        const complexAnim = animation as ComplexAnimation;
        const result = this.updateComplexAnimation(complexAnim, currentTime);

        if (result.completed) {
          completedAnimations.push(trainId);
        } else if (result.updatedAnimation) {
          updatedAnimations.set(trainId, result.updatedAnimation);
        } else {
          updatedAnimations.set(trainId, complexAnim);
        }
      }
    });

    // Aggiorna le animazioni attive
    this.activeAnimations = updatedAnimations;

    // Gestisci le animazioni completate
    completedAnimations.forEach(trainId => {
      const animation = this.activeAnimations.get(trainId);
      if (animation) {
        // Posiziona il treno alla posizione finale
        this.svgManager.positionImage(animation.img, animation.endPos.x, animation.endPos.y);

        // Aggiorna la posizione del treno
        const finalLocationId = this.getLocationIdFromElement(animation.toElement);
        if (finalLocationId) {
          this.updateTrainPosition(trainId, finalLocationId);
        }
      }
    });
  }

  /**
   * Aggiorna animazione semplice
   */
  private updateSimpleAnimation(animation: ActiveAnimation, currentTime: number, completedAnimations: string[]): void {
    const progress = Math.min(
      (currentTime - animation.startTime) / (animation.endTime - animation.startTime),
      1
    );

    if (progress >= 1) {
      completedAnimations.push(animation.trainId);
    } else {
      // Interpolazione lineare
      const currentX = animation.startPos.x + (animation.endPos.x - animation.startPos.x) * progress;
      const currentY = animation.startPos.y + (animation.endPos.y - animation.startPos.y) * progress;
      this.svgManager.positionImage(animation.img, currentX, currentY);
    }
  }

  /**
   * Aggiorna animazione complessa
   */
  private updateComplexAnimation(complexAnim: ComplexAnimation, currentTime: number): {
    completed: boolean;
    updatedAnimation?: ComplexAnimation;
  } {
    const segmentProgress = Math.min(
      (currentTime - complexAnim.startTime) / (complexAnim.endTime - complexAnim.startTime),
      1
    );

    if (segmentProgress >= 1) {
      // Segmento completato
      if (complexAnim.currentSegment >= complexAnim.path.length - 2) {
        // Animazione complessa completata
        return { completed: true };
      } else {
        // Passa al prossimo segmento
        const nextSegment = complexAnim.currentSegment + 1;
        const fromEl = this.svgManager.getElementById(complexAnim.path[nextSegment]);
        const toEl = this.svgManager.getElementById(complexAnim.path[nextSegment + 1]);

        if (fromEl && toEl) {
          const newStartPos = this.svgManager.center(fromEl);
          const newEndPos = this.svgManager.center(toEl);

          const updatedAnimation: ComplexAnimation = {
            ...complexAnim,
            currentSegment: nextSegment,
            fromElement: fromEl,
            toElement: toEl,
            startPos: newStartPos,
            endPos: newEndPos,
            startTime: currentTime,
            endTime: currentTime + complexAnim.segmentDuration
          };

          return { completed: false, updatedAnimation };
        } else {
          console.error(`❌ Elementi non trovati per segmento ${nextSegment} del percorso`);
          return { completed: true };
        }
      }
    } else {
      // Aggiorna posizione corrente del segmento
      const currentX = complexAnim.startPos.x + (complexAnim.endPos.x - complexAnim.startPos.x) * segmentProgress;
      const currentY = complexAnim.startPos.y + (complexAnim.endPos.y - complexAnim.startPos.y) * segmentProgress;
      this.svgManager.positionImage(complexAnim.img, currentX, currentY);

      return { completed: false };
    }
  }

  /**
   * Ottiene l'ID di una posizione da un elemento SVG
   */
  private getLocationIdFromElement(element: SVGGraphicsElement): string | null {
    return element.id || null;
  }

  /**
   * Aggiorna la posizione di un treno
   */
  private updateTrainPosition(trainId: string, newPosition: string): void {
    this.trainCurrentPositions.set(trainId, newPosition);

    // Controlla se il treno ha raggiunto la destinazione finale
    if (this.animationState.checkTrainDestination(trainId, newPosition)) {
      this.animationState.markTrainAsArrived(trainId);
    }
  }

  /**
   * Ottiene le animazioni completate nell'ultimo update
   */
  getCompletedAnimations(currentTime: number): string[] {
    const completed: string[] = [];

    this.activeAnimations.forEach((animation, trainId) => {
      if (animation.animationType === 'simple') {
        const progress = (currentTime - animation.startTime) / (animation.endTime - animation.startTime);
        if (progress >= 1) {
          completed.push(trainId);
        }
      }
      // Per animazioni complesse, il controllo è più complesso e viene gestito in updateAnimations
    });

    return completed;
  }

  /**
   * Pulisce le animazioni attive
   */
  clearActiveAnimations(): void {
    this.activeAnimations.clear();
  }

  /**
   * Verifica se ci sono animazioni attive
   */
  hasActiveAnimations(): boolean {
    return this.activeAnimations.size > 0;
  }

  /**
   * Ottiene le statistiche del manager
   */
  getStats() {
    const animationsByType = Array.from(this.activeAnimations.values()).reduce((acc, anim) => {
      acc[anim.animationType] = (acc[anim.animationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTrains: this.trainOrder.length,
      activeAnimations: this.activeAnimations.size,
      animationsByType,
      trainPositions: Object.fromEntries(this.trainCurrentPositions)
    };
  }
}
