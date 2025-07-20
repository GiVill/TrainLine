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
    return this.svgDocument;
  }

  /**
   * Restituisce l'elemento SVG root
   */
  getRoot(): SVGSVGElement | null {
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
  }

  /**
   * Verifica se l'SVG è stato inizializzato
   */
  isInitialized(): boolean {
    return this.svgDocument !== null && this.svgRoot !== null;
  }
}
