import { Component, Input, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-station-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.css']
})
export class StationDetailComponent implements AfterViewInit {
  @Input() station!: { stop_name: string; zone_id: string; stop_lat: number; stop_lon: number };

  expanded = false;

  toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  isExpanded(): boolean {
    return this.expanded;
  }

  @ViewChild('mapObject', { static: false })
  mapObject!: ElementRef<HTMLObjectElement>;

  ngAfterViewInit(): void {
    const objEl = this.mapObject.nativeElement;
    objEl.addEventListener('load', () => {
      const svgDoc = objEl.contentDocument;
      if (!svgDoc) return;
      const svgRoot = svgDoc.querySelector('svg');
      if (!svgRoot) return;

      // Crea l'icona del trenino
      const train = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'image');
      train.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/train-icon.svg');
      train.setAttribute('width', '40');
      train.setAttribute('height', '40');
      train.setAttribute('id', 'movingTrain');

      // Definisci l'animazione lungo il path #railPath
      const anim = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'animateMotion');
      anim.setAttribute('dur', '15s');
      anim.setAttribute('repeatCount', 'indefinite');

      const mpath = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'mpath');
      mpath.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#railPath');

      anim.appendChild(mpath);
      train.appendChild(anim);

      // Aggiungi il trenino al DOM SVG
      svgRoot.appendChild(train);
    });
  }
}
