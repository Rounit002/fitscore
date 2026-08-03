import type { Body, Constraint } from 'matter-js';
import type { DebugSnapshot, StageConfig, TerrainChunk, VehicleConfig } from '../types';
import { ParticleSystem } from '../systems/ParticleSystem';
import { Vehicle } from '../entities/Vehicle';

interface Camera { x: number; y: number }

export class GameRenderer {
  readonly context: CanvasRenderingContext2D;
  width = 1280;
  height = 720;
  readonly camera: Camera = { x: -260, y: 80 };
  private targetCamera: Camera = { x: -260, y: 80 };
  private readonly dprCap = 2;

  constructor(readonly canvas: HTMLCanvasElement, private readonly particles: ParticleSystem) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D rendering is not supported in this browser.');
    this.context = context;
    this.resize();
  }

  resize(): void {
    this.width = Math.max(320, window.innerWidth);
    this.height = Math.max(320, window.innerHeight);
    const dpr = Math.min(this.dprCap, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.context.imageSmoothingEnabled = true;
  }

  snapCamera(x: number, y: number): void {
    this.camera.x = x;
    this.camera.y = y;
    this.targetCamera = { x, y };
  }

  follow(vehicle: Vehicle, deltaSeconds: number, reducedMotion: boolean): void {
    const position = vehicle.bodies.chassis.position;
    const speedLead = Math.max(-35, Math.min(120, vehicle.bodies.chassis.velocity.x * 6));
    this.targetCamera.x = position.x - this.width * 0.38 + speedLead;
    this.targetCamera.y = position.y - this.height * 0.53;
    const smoothing = reducedMotion ? 1 : 1 - Math.pow(0.0008, deltaSeconds);
    this.camera.x += (this.targetCamera.x - this.camera.x) * smoothing;
    this.camera.y += (this.targetCamera.y - this.camera.y) * Math.min(smoothing, 0.09);
  }

  drawWorld(stage: StageConfig, chunks: TerrainChunk[], vehicle: Vehicle, time: number, debug: boolean, snapshot: DebugSnapshot): void {
    this.drawBackground(stage, time);
    const context = this.context;
    context.save();
    context.translate(-this.camera.x, -this.camera.y);
    this.drawTerrain(stage, chunks);
    this.drawDecorations(stage, chunks);
    this.drawCollectibles(chunks, time);
    this.particles.draw(context);
    this.drawVehicle(vehicle);
    if (debug) this.drawPhysicsDebug(chunks, vehicle, snapshot);
    context.restore();
  }

  drawMenu(stage: StageConfig, config: VehicleConfig, time: number): void {
    this.camera.x = time * 7;
    this.camera.y = 0;
    this.drawBackground(stage, time);
    const context = this.context;
    const groundY = this.height * 0.76;
    context.fillStyle = stage.palette.ground;
    context.beginPath();
    context.moveTo(0, groundY);
    for (let x = 0; x <= this.width + 40; x += 35) context.lineTo(x, groundY + Math.sin((x + time * 15) * 0.009) * 14);
    context.lineTo(this.width, this.height);
    context.lineTo(0, this.height);
    context.closePath();
    context.fill();
    context.strokeStyle = stage.palette.surface;
    context.lineWidth = 9;
    context.stroke();
    const x = Math.min(this.width * 0.73, this.width - 150);
    const y = groundY - config.wheelRadius - config.suspensionLength - config.bodyHeight * 0.4 + Math.sin(time * 1.9) * 3;
    this.drawShowcaseVehicle(config, x, y, time);
  }

  private drawBackground(stage: StageConfig, time: number): void {
    const context = this.context;
    const gradient = context.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, stage.palette.skyTop);
    gradient.addColorStop(1, stage.palette.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.width, this.height);

    if (stage.id === 'moon' || stage.id === 'mars') {
      context.fillStyle = 'rgba(255,255,255,.78)';
      for (let index = 0; index < 45; index += 1) {
        const x = ((index * 193 - this.camera.x * 0.02) % (this.width + 60) + this.width + 60) % (this.width + 60);
        const y = 28 + ((index * 83) % Math.max(100, this.height * 0.54));
        context.globalAlpha = 0.35 + ((index * 17) % 50) / 100;
        context.fillRect(x, y, index % 7 === 0 ? 2 : 1, index % 7 === 0 ? 2 : 1);
      }
      context.globalAlpha = 1;
    }

    const sunX = this.width * 0.78 - this.camera.x * 0.012;
    const sunY = this.height * 0.18;
    context.fillStyle = stage.palette.sun;
    context.globalAlpha = 0.86;
    context.beginPath();
    context.arc(sunX, sunY, Math.max(32, this.width * 0.035), 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;

    if (stage.id !== 'moon') this.drawClouds(time);
    this.drawMountainLayer(stage.palette.far, this.height * 0.55, 0.045, 95, 0.0018);
    this.drawMountainLayer(stage.palette.mid, this.height * 0.7, 0.1, 78, 0.0032);
  }

  private drawClouds(time: number): void {
    const context = this.context;
    context.fillStyle = 'rgba(255,255,255,.72)';
    for (let index = 0; index < 5; index += 1) {
      const drift = time * (3 + index * 0.25) - this.camera.x * 0.018;
      const x = ((index * 330 + drift) % (this.width + 240)) - 120;
      const y = 75 + (index % 3) * 64;
      context.beginPath();
      context.ellipse(x, y, 48, 17, 0, 0, Math.PI * 2);
      context.ellipse(x + 33, y - 9, 31, 22, 0, 0, Math.PI * 2);
      context.ellipse(x + 67, y + 1, 42, 15, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  private drawMountainLayer(color: string, baseline: number, parallax: number, amplitude: number, frequency: number): void {
    const context = this.context;
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(0, this.height);
    for (let x = -40; x <= this.width + 40; x += 34) {
      const worldX = x + this.camera.x * parallax;
      const height = Math.sin(worldX * frequency) * amplitude + Math.sin(worldX * frequency * 2.3 + 1.7) * amplitude * 0.35;
      context.lineTo(x, baseline - Math.abs(height));
    }
    context.lineTo(this.width, this.height);
    context.closePath();
    context.fill();
  }

  private drawTerrain(stage: StageConfig, chunks: TerrainChunk[]): void {
    const context = this.context;
    const bottom = this.camera.y + this.height + 260;
    for (const chunk of chunks) {
      if (chunk.endX < this.camera.x - 100 || chunk.startX > this.camera.x + this.width + 100) continue;
      context.fillStyle = stage.palette.groundDark;
      context.beginPath();
      context.moveTo(chunk.points[0].x, bottom);
      for (const point of chunk.points) context.lineTo(point.x, point.y + 28);
      context.lineTo(chunk.endX, bottom);
      context.closePath();
      context.fill();

      context.fillStyle = stage.palette.ground;
      context.beginPath();
      context.moveTo(chunk.points[0].x, bottom);
      for (const point of chunk.points) context.lineTo(point.x, point.y);
      context.lineTo(chunk.endX, bottom);
      context.closePath();
      context.fill();

      context.strokeStyle = stage.palette.surface;
      context.lineWidth = stage.id === 'snow' ? 13 : 8;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.beginPath();
      chunk.points.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
      context.stroke();
    }
  }

  private drawDecorations(stage: StageConfig, chunks: TerrainChunk[]): void {
    for (const chunk of chunks) {
      if (chunk.endX < this.camera.x - 100 || chunk.startX > this.camera.x + this.width + 100) continue;
      for (const decoration of chunk.decorations) this.drawDecoration(stage, decoration.x, decoration.y, decoration.type, decoration.scale);
    }
  }

  private drawDecoration(stage: StageConfig, x: number, y: number, type: TerrainChunk['decorations'][number]['type'], scale: number): void {
    const context = this.context;
    context.save();
    context.translate(x, y);
    context.scale(scale, scale);
    if (type === 'tree') {
      context.fillStyle = '#70472e';
      context.fillRect(-4, -42, 8, 44);
      context.fillStyle = stage.palette.foliage;
      for (const [dx, dy, radius] of [[0, -54, 18], [-13, -42, 14], [14, -43, 15]] as const) {
        context.beginPath(); context.arc(dx, dy, radius, 0, Math.PI * 2); context.fill();
      }
    } else if (type === 'rock') {
      context.fillStyle = stage.id === 'mars' ? '#71362f' : '#78818a';
      context.beginPath(); context.moveTo(-16, 0); context.lineTo(-10, -17); context.lineTo(8, -21); context.lineTo(18, 0); context.closePath(); context.fill();
    } else if (type === 'flower') {
      context.strokeStyle = stage.palette.foliage; context.lineWidth = 2; context.beginPath(); context.moveTo(0, 0); context.lineTo(0, -15); context.stroke();
      context.fillStyle = '#ff6d94';
      for (let index = 0; index < 5; index += 1) { const angle = index * Math.PI * 0.4; context.beginPath(); context.arc(Math.cos(angle) * 5, -15 + Math.sin(angle) * 5, 3.5, 0, Math.PI * 2); context.fill(); }
    } else if (type === 'crystal') {
      context.fillStyle = 'rgba(109,234,255,.72)'; context.beginPath(); context.moveTo(-8, 0); context.lineTo(-3, -29); context.lineTo(6, -12); context.lineTo(12, 0); context.closePath(); context.fill();
    } else {
      context.fillStyle = stage.palette.foliage;
      for (const [dx, radius] of [[-9, 10], [0, 14], [11, 9]] as const) { context.beginPath(); context.arc(dx, -radius * 0.45, radius, Math.PI, Math.PI * 2); context.fill(); }
    }
    context.restore();
  }

  private drawCollectibles(chunks: TerrainChunk[], time: number): void {
    const context = this.context;
    for (const chunk of chunks) {
      if (chunk.endX < this.camera.x - 80 || chunk.startX > this.camera.x + this.width + 80) continue;
      for (const item of chunk.collectibles) {
        if (!item.active) continue;
        const bob = Math.sin(time * 3.2 + item.phase) * 5;
        context.save();
        context.translate(item.x, item.y + bob);
        if (item.type === 'coin') {
          const color = item.value >= 10 ? '#ffd94a' : item.value >= 5 ? '#d8edf3' : '#f0a95a';
          context.fillStyle = 'rgba(22,35,57,.18)'; context.beginPath(); context.ellipse(2, 5, 15, 18, 0, 0, Math.PI * 2); context.fill();
          context.fillStyle = color; context.strokeStyle = '#fff2ae'; context.lineWidth = 3; context.beginPath(); context.ellipse(0, 0, 12 * (0.55 + Math.abs(Math.sin(time * 2.4 + item.phase)) * 0.45), 16, 0, 0, Math.PI * 2); context.fill(); context.stroke();
          context.fillStyle = '#9a6b24'; context.font = '700 11px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(String(item.value), 0, 1);
        } else {
          context.fillStyle = '#ff4b4b'; context.strokeStyle = '#fff1d0'; context.lineWidth = 3; context.beginPath(); context.roundRect(-15, -20, 30, 39, 6); context.fill(); context.stroke();
          context.fillStyle = '#fff1d0'; context.fillRect(-4, -13, 8, 25); context.fillRect(-10, -5, 20, 8); context.strokeStyle = '#273754'; context.beginPath(); context.moveTo(4, -19); context.lineTo(10, -25); context.lineTo(15, -21); context.stroke();
        }
        context.restore();
      }
    }
  }

  private drawWheel(body: Body, radius: number, accent: string): void {
    const context = this.context;
    context.save(); context.translate(body.position.x, body.position.y); context.rotate(body.angle);
    context.fillStyle = '#172033'; context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.fill();
    context.strokeStyle = '#43516a'; context.lineWidth = Math.max(4, radius * 0.18); context.stroke();
    context.strokeStyle = '#0c1220'; context.lineWidth = 3;
    for (let index = 0; index < 10; index += 1) { const angle = index * Math.PI / 5; context.beginPath(); context.moveTo(Math.cos(angle) * radius * 0.82, Math.sin(angle) * radius * 0.82); context.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); context.stroke(); }
    context.fillStyle = accent; context.beginPath(); context.arc(0, 0, radius * 0.38, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#eaf1fa'; context.beginPath(); context.arc(0, 0, radius * 0.13, 0, Math.PI * 2); context.fill();
    context.restore();
  }

  private drawVehicle(vehicle: Vehicle): void {
    const context = this.context;
    const { config } = vehicle;
    const { chassis, rearWheel, frontWheel } = vehicle.bodies;
    const rearAnchor = this.localToWorld(chassis, -config.wheelBase / 2, config.bodyHeight * 0.25);
    const frontAnchor = this.localToWorld(chassis, config.wheelBase / 2, config.bodyHeight * 0.25);
    context.strokeStyle = '#26344d'; context.lineWidth = 7; context.lineCap = 'round';
    context.beginPath(); context.moveTo(rearAnchor.x, rearAnchor.y); context.lineTo(rearWheel.position.x, rearWheel.position.y); context.moveTo(frontAnchor.x, frontAnchor.y); context.lineTo(frontWheel.position.x, frontWheel.position.y); context.stroke();
    context.strokeStyle = config.accent; context.lineWidth = 2;
    context.beginPath(); context.moveTo(rearAnchor.x, rearAnchor.y); context.lineTo(rearWheel.position.x, rearWheel.position.y); context.moveTo(frontAnchor.x, frontAnchor.y); context.lineTo(frontWheel.position.x, frontWheel.position.y); context.stroke();

    this.drawWheel(rearWheel, config.wheelRadius, config.accent);
    this.drawWheel(frontWheel, config.wheelRadius, config.accent);

    context.save(); context.translate(chassis.position.x, chassis.position.y); context.rotate(chassis.angle);
    this.drawChassisShape(config);
    this.drawDriver(config);
    context.restore();
  }

  private drawChassisShape(config: VehicleConfig): void {
    const context = this.context;
    const width = config.bodyWidth;
    const height = config.bodyHeight;
    context.fillStyle = 'rgba(12,22,38,.2)'; context.beginPath(); context.roundRect(-width / 2 + 3, -height / 2 + 5, width, height, 9); context.fill();
    context.fillStyle = config.color; context.strokeStyle = '#17243b'; context.lineWidth = 4;
    if (config.kind === 'bike') {
      context.beginPath(); context.moveTo(-width * 0.42, 4); context.lineTo(-width * 0.08, -8); context.lineTo(width * 0.25, 5); context.lineTo(width * 0.43, 4); context.lineTo(width * 0.3, 11); context.lineTo(-width * 0.38, 11); context.closePath(); context.fill(); context.stroke();
      context.strokeStyle = config.accent; context.lineWidth = 5; context.beginPath(); context.moveTo(-width * 0.15, -4); context.lineTo(width * 0.2, -22); context.lineTo(width * 0.34, -18); context.stroke();
    } else {
      context.beginPath();
      context.moveTo(-width / 2, height * 0.22); context.lineTo(-width * 0.42, -height * 0.42);
      context.lineTo(width * 0.18, -height * 0.5); context.lineTo(width / 2, -height * 0.05);
      context.lineTo(width * 0.46, height * 0.5); context.lineTo(-width * 0.43, height * 0.5); context.closePath(); context.fill(); context.stroke();
      if (config.kind !== 'tractor' && config.kind !== 'buggy') {
        context.fillStyle = '#bdeeff'; context.strokeStyle = '#17243b'; context.lineWidth = 3;
        context.beginPath(); context.moveTo(-width * 0.2, -height * 0.48); context.lineTo(-width * 0.04, -height * 1.12); context.lineTo(width * 0.27, -height * 1.08); context.lineTo(width * 0.37, -height * 0.36); context.closePath(); context.fill(); context.stroke();
      }
      if (config.kind === 'monster') {
        context.fillStyle = config.accent; context.fillRect(-width * 0.4, -height * 0.02, width * 0.78, 8);
      } else if (config.kind === 'tractor') {
        context.fillStyle = '#17243b'; context.fillRect(width * 0.16, -height * 1.28, width * 0.11, height * 0.9);
        context.fillStyle = '#384a5e'; context.fillRect(width * 0.37, -height * 1.02, 7, height * 0.7);
      } else if (config.kind === 'buggy') {
        context.strokeStyle = config.accent; context.lineWidth = 6; context.beginPath(); context.moveTo(-width * 0.28, -height * 0.38); context.lineTo(-width * 0.1, -height * 1.35); context.lineTo(width * 0.3, -height * 1.22); context.lineTo(width * 0.43, -height * 0.12); context.stroke();
      } else if (config.kind === 'rally') {
        context.fillStyle = config.accent; context.beginPath(); context.moveTo(-width * 0.43, 0); context.lineTo(width * 0.42, -height * 0.2); context.lineTo(width * 0.42, height * 0.05); context.lineTo(-width * 0.43, height * 0.26); context.closePath(); context.fill();
      }
    }
    context.fillStyle = config.accent; context.beginPath(); context.arc(width * 0.4, -height * 0.05, 5, 0, Math.PI * 2); context.fill();
  }

  private drawDriver(config: VehicleConfig): void {
    const context = this.context;
    const x = config.kind === 'bike' ? 1 : config.kind === 'tractor' ? 13 : 7;
    const y = -config.bodyHeight * (config.kind === 'bike' ? 1.22 : 1.08);
    context.strokeStyle = '#28364f'; context.lineWidth = 6; context.lineCap = 'round';
    context.beginPath(); context.moveTo(x, y + 17); context.lineTo(x - 7, y + 34); context.stroke();
    context.fillStyle = '#f3aa72'; context.strokeStyle = '#17243b'; context.lineWidth = 3; context.beginPath(); context.arc(x, y, 12, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = '#fff'; context.beginPath(); context.arc(x + 4, y - 2, 3, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#17243b'; context.beginPath(); context.arc(x + 5, y - 2, 1.3, 0, Math.PI * 2); context.fill();
    context.fillStyle = config.accent; context.beginPath(); context.arc(x - 2, y - 7, 11, Math.PI, Math.PI * 2); context.lineTo(x + 12, y - 4); context.lineTo(x + 7, y - 10); context.closePath(); context.fill();
  }

  private drawShowcaseVehicle(config: VehicleConfig, x: number, y: number, time: number): void {
    const context = this.context;
    const angle = Math.sin(time * 0.8) * 0.025;
    const wheelY = y + config.bodyHeight * 0.45 + config.suspensionLength * 0.72;
    const mockWheel = (wheelX: number, phase: number): void => {
      const body = { position: { x: wheelX, y: wheelY }, angle: time * 1.3 + phase } as Body;
      this.drawWheel(body, config.wheelRadius, config.accent);
    };
    context.strokeStyle = '#26344d'; context.lineWidth = 7; context.beginPath(); context.moveTo(x - config.wheelBase / 2, y + 7); context.lineTo(x - config.wheelBase / 2, wheelY); context.moveTo(x + config.wheelBase / 2, y + 7); context.lineTo(x + config.wheelBase / 2, wheelY); context.stroke();
    mockWheel(x - config.wheelBase / 2, 0); mockWheel(x + config.wheelBase / 2, 0.6);
    context.save(); context.translate(x, y); context.rotate(angle); this.drawChassisShape(config); this.drawDriver(config); context.restore();
  }

  private localToWorld(body: Body, x: number, y: number): { x: number; y: number } {
    const cosine = Math.cos(body.angle); const sine = Math.sin(body.angle);
    return { x: body.position.x + x * cosine - y * sine, y: body.position.y + x * sine + y * cosine };
  }

  private drawPhysicsDebug(chunks: TerrainChunk[], vehicle: Vehicle, snapshot: DebugSnapshot): void {
    const context = this.context;
    context.save(); context.lineWidth = 1.5; context.strokeStyle = 'rgba(46,255,206,.75)';
    for (const chunk of chunks) {
      if (chunk.endX < this.camera.x || chunk.startX > this.camera.x + this.width) continue;
      context.strokeStyle = 'rgba(255,210,74,.48)'; context.strokeRect(chunk.startX, this.camera.y, chunk.endX - chunk.startX, this.height);
      for (const body of chunk.bodies) this.outlineBody(body, 'rgba(46,255,206,.3)');
    }
    for (const body of [vehicle.bodies.chassis, vehicle.bodies.rearWheel, vehicle.bodies.frontWheel, vehicle.bodies.headSensor]) this.outlineBody(body, body === vehicle.bodies.headSensor ? '#ff5577' : '#35ffd0');
    for (const constraint of vehicle.bodies.constraints) this.drawConstraint(constraint);
    const center = vehicle.bodies.chassis.position;
    context.strokeStyle = '#ffed5a'; context.beginPath(); context.moveTo(center.x - 12, center.y); context.lineTo(center.x + 12, center.y); context.moveTo(center.x, center.y - 12); context.lineTo(center.x, center.y + 12); context.stroke();
    const rear = vehicle.bodies.rearWheel.position; const front = vehicle.bodies.frontWheel.position;
    context.fillStyle = vehicle.rearContact ? '#39ff83' : '#ff4f6d'; context.beginPath(); context.arc(rear.x, rear.y + vehicle.config.wheelRadius + 5, 5, 0, Math.PI * 2); context.fill();
    context.fillStyle = vehicle.frontContact ? '#39ff83' : '#ff4f6d'; context.beginPath(); context.arc(front.x, front.y + vehicle.config.wheelRadius + 5, 5, 0, Math.PI * 2); context.fill();
    context.restore();

    context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.fillStyle = 'rgba(8,16,31,.86)'; context.fillRect(18, 112, 230, 142); context.fillStyle = '#8fffe4'; context.font = '600 13px monospace';
    const lines = [`PHYSICS DEBUG`, `FPS  ${snapshot.fps.toFixed(0)}`, `SPEED  ${snapshot.speed.toFixed(2)}`, `ANG V  ${snapshot.angularVelocity.toFixed(3)}`, `BODIES  ${snapshot.bodyCount}`, `CHUNKS  ${snapshot.chunkCount}`, `CONTACT  R:${snapshot.rearContact ? 'Y' : 'N'} F:${snapshot.frontContact ? 'Y' : 'N'}`];
    lines.forEach((line, index) => context.fillText(line, 31, 137 + index * 17)); context.restore();
  }

  private outlineBody(body: Body, color: string): void {
    const context = this.context; context.strokeStyle = color; context.beginPath();
    body.vertices.forEach((vertex, index) => index === 0 ? context.moveTo(vertex.x, vertex.y) : context.lineTo(vertex.x, vertex.y)); context.closePath(); context.stroke();
  }

  private drawConstraint(constraint: Constraint): void {
    if (!constraint.bodyA || !constraint.bodyB) return;
    const start = this.localToWorld(constraint.bodyA, constraint.pointA.x, constraint.pointA.y);
    const end = this.localToWorld(constraint.bodyB, constraint.pointB.x, constraint.pointB.y);
    this.context.strokeStyle = 'rgba(255,96,205,.78)'; this.context.beginPath(); this.context.moveTo(start.x, start.y); this.context.lineTo(end.x, end.y); this.context.stroke();
  }
}
