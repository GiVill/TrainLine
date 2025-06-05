import { Component, Input, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';      // ← serve per il pipe `number`
import * as THREE from 'three';

@Component({
  selector: 'app-station-detail',
  standalone: true,                                 // ← diventa standalone
  imports: [CommonModule],                          // ← importa CommonModule per i pipe
  templateUrl: './station-detail.component.html',
  styleUrls: ['./station-detail.component.css']
})
export class StationDetailComponent implements AfterViewInit, OnDestroy {
  @Input() station!: {
    stop_name: string;
    zone_id: string;
    stop_lat: number;
    stop_lon: number;
    // … altri campi se necessario …
  };

  public expanded: boolean = false;
  isExpanded(): boolean { return this.expanded; }
  toggleExpanded(): void { this.expanded = !this.expanded; }

  @ViewChild('threeContainer', { static: false }) threeContainer!: ElementRef;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationId!: number;
  private trains: Array<{ mesh: THREE.Group; speed: number }> = [];
  private tracks: THREE.Mesh[] = [];
  private isAnimating: boolean = true;
  private lightsOn: boolean = true;

  private stationConfig = {
    trackCount: 6,
    trackLength: 100,
    trackSpacing: 8,
    platformWidth: 4,
    platformHeight: 1
  };

  constructor() {}

  ngAfterViewInit(): void {
    this.initThree();
    this.animate();
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
  }

  private initThree(): void {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xcccccc, 50, 200);    const width  = this.threeContainer.nativeElement.clientWidth;
    const height = this.threeContainer.nativeElement.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    
    // Set up isometric view
    const d = 80;
    this.camera.position.set(d, d * 0.8, d);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x87ceeb);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.threeContainer.nativeElement.appendChild(this.renderer.domElement);

    this.setupMouseControls();
    this.setupLighting();
    this.createStation();
    this.createTrains();
  }

  private setupMouseControls(): void {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    const dom: HTMLElement = this.renderer.domElement;

    dom.addEventListener('mousedown', (event: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    });

    dom.addEventListener('mousemove', (event: MouseEvent) => {
      if (!isDragging) return;
      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
      };
      const rotationSpeed = 0.005;
      const oldX = this.camera.position.x;
      const oldZ = this.camera.position.z;
      this.camera.position.x =
        oldX * Math.cos(deltaMove.x * rotationSpeed) -
        oldZ * Math.sin(deltaMove.x * rotationSpeed);
      this.camera.position.z =
        oldX * Math.sin(deltaMove.x * rotationSpeed) +
        oldZ * Math.cos(deltaMove.x * rotationSpeed);
      this.camera.position.y += deltaMove.y * 0.1;
      this.camera.lookAt(0, 0, 0);
      previousMousePosition = { x: event.clientX, y: event.clientY };
    });

    dom.addEventListener('mouseup', () => {
      isDragging = false;
    });

    dom.addEventListener('wheel', (event: WheelEvent) => {
      const zoomSpeed = 0.1;
      const direction = event.deltaY > 0 ? 1 : -1;
      this.camera.position.multiplyScalar(1 + direction * zoomSpeed);
      this.camera.lookAt(0, 0, 0);
    });
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 25);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    for (let i = 0; i < 8; i++) {
      const light = new THREE.PointLight(0xffff88, 0.5, 50);
      light.position.set(-40 + i * 12, 15, 0);
      this.scene.add(light);
    }
  }

  private createStation(): void {
    const groundGeometry = new THREE.PlaneGeometry(200, 150);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90ee90 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.createTracksAndPlatforms();
    this.createStationBuilding();
    this.createCanopy();
    this.createSigns();
  }

  private createTracksAndPlatforms(): void {
    const { trackCount, trackLength, trackSpacing, platformWidth, platformHeight } = this.stationConfig;
    const trackGeometry = new THREE.BoxGeometry(trackLength, 0.3, 1.5);
    const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const platformGeometry = new THREE.BoxGeometry(trackLength * 0.8, platformHeight, platformWidth);
    const platformMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });

    for (let i = 0; i < trackCount; i++) {
      const z = (i - trackCount / 2) * trackSpacing;
      const track = new THREE.Mesh(trackGeometry, trackMaterial);
      track.position.set(0, 0.15, z);
      track.castShadow = true;
      this.scene.add(track);
      this.tracks.push(track);

      for (let j = 0; j < 2; j++) {
        const railGeometry = new THREE.BoxGeometry(trackLength, 0.2, 0.1);
        const railMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const rail = new THREE.Mesh(railGeometry, railMaterial);
        rail.position.set(0, 0.4, z + (j - 0.5) * 1.2);
        this.scene.add(rail);
      }

      if (i > 0 && i < trackCount - 1) {
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(0, platformHeight / 2, z + trackSpacing / 2);
        platform.castShadow = true;
        platform.receiveShadow = true;
        this.scene.add(platform);
      }
    }
  }

  private createStationBuilding(): void {
    const buildingGeometry = new THREE.BoxGeometry(60, 20, 15);
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0xd4ac86 });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.set(0, 10, -40);
    building.castShadow = true;
    this.scene.add(building);

    const roofGeometry = new THREE.BoxGeometry(65, 2, 20);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 21, -40);
    this.scene.add(roof);

    for (let i = -2; i <= 2; i++) {
      const windowGeometry = new THREE.BoxGeometry(8, 6, 0.5);
      const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87ceeb });
      const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
      windowMesh.position.set(i * 12, 12, -32);
      this.scene.add(windowMesh);
    }
  }

  private createCanopy(): void {
    const { trackCount, trackLength, trackSpacing } = this.stationConfig;
    const canopyGeometry = new THREE.BoxGeometry(trackLength * 0.9, 1, trackSpacing * (trackCount - 1));
    const canopyMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.position.set(0, 18, 0);
    canopy.castShadow = true;
    this.scene.add(canopy);

    for (let i = -2; i <= 2; i++) {
      for (let j = -1; j <= 1; j++) {
        const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.5, 17);
        const pillarMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(i * 20, 8.5, j * 15);
        pillar.castShadow = true;
        this.scene.add(pillar);
      }
    }
  }

  private createSigns(): void {
    const { trackCount, trackSpacing } = this.stationConfig;
    for (let i = 0; i < trackCount; i++) {
      const z = (i - trackCount / 2) * trackSpacing;
      const signGeometry = new THREE.BoxGeometry(2, 3, 0.2);
      const signMaterial = new THREE.MeshLambertMaterial({ color: 0x0066cc });
      const sign = new THREE.Mesh(signGeometry, signMaterial);
      sign.position.set(-45, 5, z);
      this.scene.add(sign);

      const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5);
      const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.set(-45, 2.5, z);
      this.scene.add(pole);
    }
  }

  private createTrains(): void {
    const trainConfigs = [
      { type: 'Frecciarossa', color: 0xff0000, track: 0, position: -30 },
      { type: 'Italo', color: 0x800080, track: 2, position: 20 },
      { type: 'Regionale', color: 0x0066cc, track: 4, position: -10 },
      { type: 'Intercity', color: 0x00aa00, track: 5, position: 35 }
    ];

    trainConfigs.forEach(config => {
      const trainMesh = this.createTrain(config.color, config.type);
      const z = (config.track - this.stationConfig.trackCount / 2) * this.stationConfig.trackSpacing;
      trainMesh.position.set(config.position, 2, z);
      const speed = (Math.random() - 0.5) * 0.1;
      this.trains.push({ mesh: trainMesh, speed: speed });
      this.scene.add(trainMesh);
    });
  }

  private createTrain(color: number, type: string): THREE.Group {
    const trainGroup = new THREE.Group();

    const locomotiveGeometry = new THREE.BoxGeometry(12, 4, 3);
    const locomotiveMaterial = new THREE.MeshLambertMaterial({ color: color });
    const locomotive = new THREE.Mesh(locomotiveGeometry, locomotiveMaterial);
    locomotive.position.set(0, 2, 0);
    locomotive.castShadow = true;
    trainGroup.add(locomotive);

    for (let i = 1; i <= 3; i++) {
      const carriageGeometry = new THREE.BoxGeometry(10, 3.5, 2.8);
      const carriageMaterial = new THREE.MeshLambertMaterial({ color: color });
      const carriage = new THREE.Mesh(carriageGeometry, carriageMaterial);
      carriage.position.set(-i * 12, 1.75, 0);
      carriage.castShadow = true;
      trainGroup.add(carriage);
      for (let j = -3; j <= 3; j++) {
        const windowGeometry = new THREE.BoxGeometry(1, 0.8, 0.1);
        const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87ceeb });
        const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
        windowMesh.position.set(-i * 12 + j * 1.5, 2.2, 1.45);
        trainGroup.add(windowMesh);
      }
    }

    for (let i = 0; i <= 3; i++) {
      for (let j = 0; j < 2; j++) {
        const wheelGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.3);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(-i * 12 + 3, 0.6, (j - 0.5) * 2.5);
        trainGroup.add(wheel);
      }
    }

    return trainGroup;
  }
  private animate(): void {
    if (this.isAnimating) {
      this.trains.forEach(trainObj => {
        trainObj.mesh.position.x += trainObj.speed;
        if (trainObj.mesh.position.x > 60 || trainObj.mesh.position.x < -60) {
          trainObj.speed = -trainObj.speed;
        }
      });
    }

    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  private onWindowResize(): void {
    if (!this.renderer || !this.camera) return;
    const width = this.threeContainer.nativeElement.clientWidth;
    const height = this.threeContainer.nativeElement.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public toggleLights(): void {
    this.lightsOn = !this.lightsOn;
    this.scene.traverse(child => {
      if (child instanceof THREE.PointLight) {
        child.visible = this.lightsOn;
      }
    });
  }
}
