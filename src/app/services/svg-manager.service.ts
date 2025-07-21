import { Injectable } from '@angular/core';

const ORIG = 'data-orig-status'; // attribute dove salviamo lo stato di partenza

@Injectable({
  providedIn: 'root'
})
export class SvgManagerService {
  private svgDocument: Document | null = null;
  private svgRoot: SVGSVGElement | null = null;

  /**
   * Inizializza il servizio con il documento SVG
   */
  initialize(svgDocument: Document): void {
    this.svgDocument = svgDocument;
    this.svgRoot = svgDocument.querySelector('svg') as SVGSVGElement;
    this.stampOriginalTrackStatus();
    this.applyTrackVisibility();
  }

  /**
   * Restituisce il documento SVG
   */
  getDocument(): Document | null {
    console.log('SVG document retrieved:', this.svgDocument);
    return this.svgDocument;
  }

  /**
   * Restituisce l'elemento SVG root
   */
  getRoot(): SVGSVGElement | null {
    console.log('SVG root retrieved:', this.svgRoot);
    return this.svgRoot;
  }

  /**
   * Trova un elemento SVG per ID
   */
  getElementById(id: string): SVGGraphicsElement | null {
    return this.svgDocument?.getElementById(id) as SVGGraphicsElement | null;
  }

  /**
   * Calcola il centro di un elemento SVG
   */
  center(el: SVGGraphicsElement): { x: number; y: number } {
    if (!this.svgRoot) {
      throw new Error('SVG root not initialized');
    }

    const r = el.getBoundingClientRect();
    const p = this.svgRoot.createSVGPoint();
    p.x = r.left + r.width / 2;
    p.y = r.top + r.height / 2;

    const transformedPoint = p.matrixTransform(this.svgRoot.getScreenCTM()!.inverse());
    return { x: transformedPoint.x, y: transformedPoint.y };
  }

  /**
   * Aggiorna lo stato di un binario (track)
   */
  updateTrackStatus(pointA: string, pointB: string, status: 'open' | 'closed'): void {
    if (!this.svgDocument) return;

    [`${pointA},${pointB}`, `${pointB},${pointA}`].forEach(path => {
      const line = this.svgDocument!.querySelector<SVGGraphicsElement>(`line[data-path="${path}"]`);
      if (line) {
        line.style.transition = 'opacity 300ms linear';
        line.setAttribute('data-status', status);
        line.style.opacity = status === 'open' ? '1' : '0';
      }
    });
  }

  /**
   * Aggiorna lo stato di uno scambio (switch)
   */
  updateSwitchStatus(switchId: string, status: 'open' | 'closed'): void {
    if (!this.svgDocument) return;

    const switchEl = this.getElementById(switchId);
    if (switchEl) {
      switchEl.style.transition = 'opacity 300ms linear';
      switchEl.setAttribute('data-status', status);
      switchEl.style.opacity = status === 'open' ? '1' : '0.3';
    }

    // Trova anche eventuali linee collegate a questo switch
    const lines = this.svgDocument.querySelectorAll<SVGGraphicsElement>(`line[data-path*="${switchId}"]`);
    lines.forEach(line => {
      line.style.transition = 'opacity 300ms linear';
      line.setAttribute('data-status', status);
      line.style.opacity = status === 'open' ? '1' : '0';
    });
  }

  /**
   * Crea un elemento image per rappresentare un treno
   */
  createTrainImage(trainImage: string): SVGImageElement {
    if (!this.svgDocument || !this.svgRoot) {
      throw new Error('SVG not initialized');
    }

    const img = this.svgDocument.createElementNS('http://www.w3.org/2000/svg', 'image');
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', trainImage);
    img.setAttribute('width', '27');
    img.setAttribute('height', '27');
    img.style.pointerEvents = 'none';

    this.svgRoot.appendChild(img);
    return img;
  }

  /**
   * Posiziona un elemento image alle coordinate specificate
   */
  positionImage(img: SVGImageElement, x: number, y: number): void {
    img.setAttribute('x', String(x - 12)); // Offset per centrare l'immagine
    img.setAttribute('y', String(y - 12));
  }

  /**
   * Rimuove un elemento image dal DOM
   */
  removeImage(img: SVGImageElement): void {
    img.remove();
  }

  /**
   * Salva lo stato originale dei binari la prima volta che il file viene caricato
   */
  private stampOriginalTrackStatus(): void {
    if (!this.svgDocument) return;

    this.svgDocument.querySelectorAll<SVGGraphicsElement>('line[data-path]')
      .forEach(line => {
        if (!line.hasAttribute(ORIG)) {
          const st = line.getAttribute('data-status') || 'open';
          line.setAttribute(ORIG, st);
        }
      });
  }

  /**
   * Ripristina lo stato originale dei binari
   */
  restoreOriginalTrackStatus(): void {
    if (!this.svgDocument) return;

    this.svgDocument.querySelectorAll<SVGGraphicsElement>('line[data-path]')
      .forEach(line => {
        const orig = line.getAttribute(ORIG) || 'open';
        line.setAttribute('data-status', orig);
      });
  }

  /**
   * Applica la visibilità basata sullo stato corrente dei binari
   */
  applyTrackVisibility(): void {
    if (!this.svgDocument) return;

    this.svgDocument.querySelectorAll<SVGGraphicsElement>('line[data-status]')
      .forEach(l => {
        const st = l.getAttribute('data-status');
        l.style.opacity = st === 'closed' ? '0' : '1';
      });
  }

  /**
   * Reset completo dell'SVG allo stato iniziale
   */
  reset(): void {
    this.restoreOriginalTrackStatus();
    this.applyTrackVisibility();

    // Rimuove tutti i treni dal DOM
    if (this.svgDocument) {
      const trainImages = this.svgDocument.querySelectorAll('image[href*="treno"]');
      trainImages.forEach(img => img.remove());
    }

    // Rimuove tutti i marker di attività
    this.removeAllActivityMarkers();

    // Ripristina tutti i colori originali
    this.restoreAllOriginalColors();
  }

  /**
   * Verifica se l'SVG è stato inizializzato
   */
  isInitialized(): boolean {
    return this.svgDocument !== null && this.svgRoot !== null;
  }

  // ────────────────────────────────────────────────────
  // NUOVI METODI PER GESTIRE GLI EVENTI AGGIORNATI
  // ────────────────────────────────────────────────────

  /**
   * Aggiorna la configurazione di uno switch
   */
  updateSwitchConfiguration(switchId: string, fromTrack: string, toTrack: string): void {
    const switchElement = this.getElementById(switchId);
    if (!switchElement) {
      console.error(`❌ Switch non trovato: ${switchId}`);
      return;
    }

    // Rimuovi configurazioni precedenti
    switchElement.classList.remove('switch-from-1', 'switch-from-2', 'switch-to-1', 'switch-to-2');

    // Aggiungi nuove classi CSS per indicare la configurazione
    switchElement.classList.add(`switch-config-${fromTrack.replace(/[^a-zA-Z0-9]/g, '-')}-to-${toTrack.replace(/[^a-zA-Z0-9]/g, '-')}`);

    // Cambia colore temporaneamente per indicare la commutazione
    this.temporaryColorChange(switchElement, '#ff9800', 1500); // Arancione per 1.5s

    console.log(`✅ Switch ${switchId} configurato: ${fromTrack} → ${toTrack}`);
  }

  /**
   * Evidenzia un binario con uno stile specifico
   */
  highlightTrack(trackId: string, style: 'reserved' | 'switch-active' | 'in-use'): void {
    const trackElement = this.getElementById(trackId);
    if (!trackElement) {
      console.error(`❌ Binario non trovato: ${trackId}`);
      return;
    }

    // Rimuovi highlights precedenti
    trackElement.classList.remove('track-reserved', 'track-switch-active', 'track-in-use');

    // Aggiungi nuovo highlight
    switch (style) {
      case 'reserved':
        trackElement.classList.add('track-reserved');
        this.temporaryColorChange(trackElement, '#2196f3', 0); // Blu permanente fino a rimozione
        break;
      case 'switch-active':
        trackElement.classList.add('track-switch-active');
        this.temporaryColorChange(trackElement, '#ff5722', 1500); // Rosso per 1.5s
        break;
      case 'in-use':
        trackElement.classList.add('track-in-use');
        this.temporaryColorChange(trackElement, '#4caf50', 0); // Verde permanente fino a rimozione
        break;
    }

    console.log(`✅ Binario ${trackId} evidenziato con stile: ${style}`);
  }

  /**
   * Rimuove l'evidenziazione da un binario
   */
  removeTrackHighlight(trackId: string): void {
    const trackElement = this.getElementById(trackId);
    if (!trackElement) {
      return;
    }

    // Rimuovi tutte le classi di highlight
    trackElement.classList.remove('track-reserved', 'track-switch-active', 'track-in-use');

    // Ripristina colore originale
    this.restoreOriginalColor(trackElement);

    console.log(`✅ Evidenziazione rimossa da binario ${trackId}`);
  }

  /**
   * Cambia temporaneamente il colore di un elemento
   */
  private temporaryColorChange(element: SVGElement, color: string, duration: number): void {
    // Salva il colore originale se non già salvato
    if (!element.hasAttribute('data-original-color')) {
      const originalColor = element.getAttribute('stroke') || element.getAttribute('fill') || '#000000';
      element.setAttribute('data-original-color', originalColor);
    }

    // Applica il nuovo colore
    if (element.getAttribute('stroke')) {
      element.setAttribute('stroke', color);
    }
    if (element.getAttribute('fill') && element.getAttribute('fill') !== 'none') {
      element.setAttribute('fill', color);
    }

    // Se la durata è maggiore di 0, programma il ripristino
    if (duration > 0) {
      setTimeout(() => {
        this.restoreOriginalColor(element);
      }, duration);
    }
  }

  /**
   * Ripristina il colore originale di un elemento
   */
  private restoreOriginalColor(element: SVGElement): void {
    const originalColor = element.getAttribute('data-original-color');
    if (originalColor) {
      if (element.getAttribute('stroke')) {
        element.setAttribute('stroke', originalColor);
      }
      if (element.getAttribute('fill') && element.getAttribute('fill') !== 'none') {
        element.setAttribute('fill', originalColor);
      }
    }
  }

  /**
   * Ripristina i colori originali di tutti gli elementi
   */
  private restoreAllOriginalColors(): void {
    if (!this.svgDocument) return;

    const elementsWithOriginalColors = this.svgDocument.querySelectorAll<SVGElement>('[data-original-color]');
    elementsWithOriginalColors.forEach(element => {
      this.restoreOriginalColor(element);
      element.removeAttribute('data-original-color');
    });
  }

  /**
   * Aggiunge animazione CSS a un elemento
   */
  addAnimation(elementId: string, animationClass: string, duration: number = 1000): void {
    const element = this.getElementById(elementId);
    if (!element) {
      console.error(`❌ Elemento non trovato per animazione: ${elementId}`);
      return;
    }

    element.classList.add(animationClass);

    if (duration > 0) {
      setTimeout(() => {
        element.classList.remove(animationClass);
      }, duration);
    }
  }

  /**
   * Crea un marker temporaneo per indicare attività
   */
  createActivityMarker(locationId: string, type: 'start' | 'switch' | 'reserve', duration: number = 2000): void {
    if (!this.svgDocument || !this.svgRoot) {
      console.error('❌ SVG non inizializzato per creare marker');
      return;
    }

    const location = this.getElementById(locationId);
    if (!location) {
      console.error(`❌ Posizione non trovata per marker: ${locationId}`);
      return;
    }

    const center = this.center(location);
    const markerId = `activity-marker-${locationId}-${Date.now()}`;

    // Crea un cerchio colorato come marker
    const marker = this.svgDocument.createElementNS('http://www.w3.org/2000/svg', 'circle');
    marker.setAttribute('id', markerId);
    marker.setAttribute('cx', String(center.x));
    marker.setAttribute('cy', String(center.y));
    marker.setAttribute('r', '8');
    marker.classList.add('activity-marker', `activity-${type}`);

    // Colori diversi per tipo di attività
    const colors = {
      start: '#4caf50',    // Verde per inizio treno
      switch: '#ff9800',   // Arancione per cambio scambio
      reserve: '#2196f3'   // Blu per prenotazione binario
    };

    marker.setAttribute('fill', colors[type]);
    marker.setAttribute('stroke', '#ffffff');
    marker.setAttribute('stroke-width', '2');
    marker.setAttribute('opacity', '0.8');

    // Aggiungi animazione pulsante
    marker.style.animation = 'pulse 1s ease-in-out infinite alternate';

    // Inserisci il marker nell'SVG
    this.svgRoot.appendChild(marker);

    // Rimuovi automaticamente dopo la durata specificata
    if (duration > 0) {
      setTimeout(() => {
        this.removeActivityMarker(markerId);
      }, duration);
    }

    console.log(`✅ Marker di attività creato: ${type} a ${locationId}`);
  }

  /**
   * Rimuove un marker di attività specifico
   */
  removeActivityMarker(markerId: string): void {
    if (!this.svgDocument) return;

    const marker = this.svgDocument.getElementById(markerId);
    if (marker) {
      marker.remove();
      console.log(`✅ Marker di attività rimosso: ${markerId}`);
    }
  }

  /**
   * Rimuove tutti i marker di attività
   */
  removeAllActivityMarkers(): void {
    if (!this.svgDocument) return;

    const markers = this.svgDocument.querySelectorAll('.activity-marker');
    markers.forEach(marker => marker.remove());
    console.log(`✅ Tutti i marker di attività rimossi`);
  }

  /**
   * Crea un indicatore di direzione per i movimenti
   */
  createDirectionIndicator(fromId: string, toId: string, duration: number = 1500): void {
    if (!this.svgDocument || !this.svgRoot) return;

    const fromElement = this.getElementById(fromId);
    const toElement = this.getElementById(toId);

    if (!fromElement || !toElement) {
      console.error(`❌ Elementi non trovati per indicatore direzione: ${fromId} → ${toId}`);
      return;
    }

    const fromCenter = this.center(fromElement);
    const toCenter = this.center(toElement);

    // Crea una freccia SVG
    const arrow = this.svgDocument.createElementNS('http://www.w3.org/2000/svg', 'path');
    const arrowId = `direction-arrow-${Date.now()}`;
    arrow.setAttribute('id', arrowId);

    // Calcola la direzione
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    const angle = Math.atan2(dy, dx);

    // Posizione della freccia (a metà strada)
    const midX = fromCenter.x + dx * 0.5;
    const midY = fromCenter.y + dy * 0.5;

    // Crea il path della freccia
    const arrowSize = 10;
    const arrowPath = `M ${midX - arrowSize} ${midY - arrowSize/2}
                       L ${midX} ${midY}
                       L ${midX - arrowSize} ${midY + arrowSize/2}
                       Z`;

    arrow.setAttribute('d', arrowPath);
    arrow.setAttribute('fill', '#ff5722');
    arrow.setAttribute('stroke', '#ffffff');
    arrow.setAttribute('stroke-width', '1');
    arrow.setAttribute('opacity', '0.9');

    // Ruota la freccia nella direzione corretta
    arrow.setAttribute('transform', `rotate(${angle * 180 / Math.PI} ${midX} ${midY})`);

    // Aggiungi animazione di fade in/out
    arrow.style.animation = 'fadeInOut 1.5s ease-in-out';

    this.svgRoot.appendChild(arrow);

    // Rimuovi automaticamente
    setTimeout(() => {
      arrow.remove();
    }, duration);

    console.log(`✅ Indicatore di direzione creato: ${fromId} → ${toId}`);
  }

  /**
   * Ottiene statistiche sul contenuto SVG
   */
  getStats() {
    if (!this.svgDocument) {
      return {
        elements: 0,
        tracks: 0,
        switches: 0,
        trains: 0,
        markers: 0
      };
    }

    return {
      elements: this.svgDocument.querySelectorAll('*').length,
      tracks: this.svgDocument.querySelectorAll('line[data-path]').length,
      switches: this.svgDocument.querySelectorAll('[id*="switch"]').length,
      trains: this.svgDocument.querySelectorAll('image[href*="treno"]').length,
      markers: this.svgDocument.querySelectorAll('.activity-marker').length
    };
  }
}
