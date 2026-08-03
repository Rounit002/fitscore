import { Bodies, Composite, World, type Body, type Engine } from 'matter-js';
import { COLLISION_CATEGORY, PX_PER_METER, TERRAIN_CHUNK_WIDTH, TERRAIN_POINT_STEP, WORLD_BASELINE_Y } from '../core/constants';
import type { Collectible, Decoration, StageConfig, TerrainChunk, TerrainPoint } from '../types';

const clamp = (value: number, minimum: number, maximum: number): number => Math.max(minimum, Math.min(maximum, value));

const hash = (value: number): number => {
  const sine = Math.sin(value * 127.1 + 311.7) * 43758.5453123;
  return sine - Math.floor(sine);
};

export class TerrainGenerator {
  private readonly chunks = new Map<number, TerrainChunk>();
  private readonly collectiblePool: Collectible[] = [];
  private nextChunkIndex = -2;
  private nextStartX = -2 * TERRAIN_CHUNK_WIDTH;
  private lastY = WORLD_BASELINE_Y;
  private nextCollectibleId = 1;

  constructor(
    private readonly engine: Engine,
    private stage: StageConfig,
    private readonly seed = Math.floor(Math.random() * 1_000_000),
  ) {}

  reset(stage: StageConfig): void {
    for (const chunk of this.chunks.values()) {
      World.remove(this.engine.world, chunk.bodies);
      this.collectiblePool.push(...chunk.collectibles);
    }
    this.chunks.clear();
    this.stage = stage;
    this.nextChunkIndex = -2;
    this.nextStartX = -2 * TERRAIN_CHUNK_WIDTH;
    this.lastY = WORLD_BASELINE_Y;
    this.ensureAround(0, 1280);
  }

  ensureAround(cameraX: number, viewportWidth: number): void {
    const generateUntil = cameraX + viewportWidth * 2.8;
    this.generateThroughX(generateUntil);
    const removeBefore = cameraX - viewportWidth * 2.2;
    for (const [index, chunk] of this.chunks) {
      if (chunk.endX >= removeBefore) continue;
      World.remove(this.engine.world, chunk.bodies);
      this.collectiblePool.push(...chunk.collectibles);
      this.chunks.delete(index);
    }
  }

  generateThroughX(targetX: number): void {
    while (this.nextStartX <= targetX) this.generateChunk();
  }

  private generateChunk(): void {
    const index = this.nextChunkIndex;
    const startX = this.nextStartX;
    const endX = startX + TERRAIN_CHUNK_WIDTH;
    const points: TerrainPoint[] = [];
    const pointCount = Math.ceil(TERRAIN_CHUNK_WIDTH / TERRAIN_POINT_STEP);

    for (let pointIndex = 0; pointIndex <= pointCount; pointIndex += 1) {
      const x = Math.min(endX, startX + pointIndex * TERRAIN_POINT_STEP);
      let y: number;
      if (x < 700) {
        const ease = clamp((x + 300) / 1000, 0, 1);
        y = WORLD_BASELINE_Y + Math.sin((x - 180) * 0.006) * 3 * ease;
      } else {
        const distance = Math.max(0, (x - 620) / PX_PER_METER);
        const difficulty = clamp(distance / 3200, 0, 1);
        const gentleProgress = clamp(distance / 300, 0, 1);
        const amplitude = (10 + gentleProgress * 34 + difficulty * 92) * this.stage.hillScale;
        const broadWave = Math.sin((x + this.seed) * (0.0021 + difficulty * 0.00035)) * amplitude;
        const mediumWave = Math.sin((x - this.seed * 0.37) * 0.0067) * amplitude * (0.12 + gentleProgress * 0.22) * this.stage.roughness;
        const noise = (hash(Math.floor(x / 190) + this.seed) - 0.5) * amplitude * 0.55 * (0.2 + gentleProgress * 0.8);
        const plateau = Math.sin((x + this.seed * 0.11) * 0.00043) * 48 * difficulty;
        const target = WORLD_BASELINE_Y + broadWave + mediumWave + noise + plateau;
        const maxSlope = (0.15 + gentleProgress * 0.24 + difficulty * 0.4) * (0.86 + this.stage.roughness * 0.14);
        const maxDelta = TERRAIN_POINT_STEP * clamp(maxSlope, 0.14, 0.9);
        y = this.lastY + clamp(target - this.lastY, -maxDelta, maxDelta) * 0.7;
        y = clamp(y, WORLD_BASELINE_Y - 285, WORLD_BASELINE_Y + 245);
      }
      this.lastY = y;
      points.push({ x, y });
    }

    const bodies = this.createCollisionBodies(points, index);
    const collectibles = this.createCollectibles(index, points);
    const decorations = this.createDecorations(index, points);
    const chunk: TerrainChunk = { index, startX, endX, points, bodies, collectibles, decorations };
    this.chunks.set(index, chunk);
    World.add(this.engine.world, bodies);
    this.nextChunkIndex += 1;
    this.nextStartX = endX;
  }

  private createCollisionBodies(points: TerrainPoint[], chunkIndex: number): Body[] {
    const thickness = 150;
    const bodies: Body[] = [];
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy) + 2;
      const angle = Math.atan2(dy, dx);
      const normalX = -Math.sin(angle);
      const normalY = Math.cos(angle);
      const body = Bodies.rectangle(
        (start.x + end.x) / 2 + normalX * thickness / 2,
        (start.y + end.y) / 2 + normalY * thickness / 2,
        length,
        thickness,
        {
          isStatic: true,
          angle,
          friction: 1,
          restitution: 0.02,
          label: `terrain:${chunkIndex}:${index}`,
          collisionFilter: { category: COLLISION_CATEGORY.terrain, mask: COLLISION_CATEGORY.vehicle | COLLISION_CATEGORY.sensor },
          chamfer: { radius: 2 },
        },
      );
      bodies.push(body);
    }
    return bodies;
  }

  private acquireCollectible(type: 'coin' | 'fuel', x: number, y: number, value: number, phase: number): Collectible {
    const collectible = this.collectiblePool.pop() ?? { id: 0, type, x, y, value, active: true, phase };
    Object.assign(collectible, { id: this.nextCollectibleId++, type, x, y, value, active: true, phase });
    return collectible;
  }

  private createCollectibles(chunkIndex: number, points: TerrainPoint[]): Collectible[] {
    if (chunkIndex < 0) return [];
    const collectibles: Collectible[] = [];
    const count = 4 + Math.floor(hash(chunkIndex + this.seed) * 4);
    const arcHeight = 32 + hash(chunkIndex * 3 + this.seed) * 46;
    for (let index = 0; index < count; index += 1) {
      const ratio = (index + 1) / (count + 1);
      const x = points[0].x + ratio * (points.at(-1)!.x - points[0].x);
      const groundY = this.interpolate(points, x);
      const y = groundY - 54 - Math.sin(ratio * Math.PI) * arcHeight;
      const roll = hash(chunkIndex * 17 + index * 31 + this.seed);
      const value = roll > 0.92 ? 10 : roll > 0.7 ? 5 : 1;
      collectibles.push(this.acquireCollectible('coin', x, y, value, roll * Math.PI * 2));
    }
    if (chunkIndex > 0 && chunkIndex % this.stage.fuelEveryChunks === 0) {
      const ratio = 0.42 + hash(chunkIndex + this.seed * 2) * 0.28;
      const x = points[0].x + ratio * (points.at(-1)!.x - points[0].x);
      collectibles.push(this.acquireCollectible('fuel', x, this.interpolate(points, x) - 66, 38, hash(chunkIndex) * 6));
    }
    return collectibles;
  }

  private createDecorations(chunkIndex: number, points: TerrainPoint[]): Decoration[] {
    if (chunkIndex < -1) return [];
    const decorations: Decoration[] = [];
    const count = 2 + Math.floor(hash(chunkIndex * 19 + this.seed) * 4);
    const types: Decoration['type'][] = this.stage.id === 'moon' ? ['rock', 'crystal'] : this.stage.id === 'mars' ? ['rock', 'bush'] : ['tree', 'rock', 'flower', 'bush'];
    for (let index = 0; index < count; index += 1) {
      const ratio = (index + 0.65) / (count + 0.35);
      const x = points[0].x + ratio * (points.at(-1)!.x - points[0].x);
      decorations.push({
        x,
        y: this.interpolate(points, x),
        type: types[Math.floor(hash(chunkIndex * 13 + index + this.seed) * types.length)],
        scale: 0.65 + hash(chunkIndex * 7 + index * 5) * 0.75,
      });
    }
    return decorations;
  }

  private interpolate(points: TerrainPoint[], x: number): number {
    const index = clamp(Math.floor((x - points[0].x) / TERRAIN_POINT_STEP), 0, points.length - 2);
    const start = points[index];
    const end = points[index + 1];
    const ratio = (x - start.x) / Math.max(1, end.x - start.x);
    return start.y + (end.y - start.y) * clamp(ratio, 0, 1);
  }

  heightAt(x: number): number {
    const chunkIndex = Math.floor(x / TERRAIN_CHUNK_WIDTH);
    const chunk = this.chunks.get(chunkIndex) ?? [...this.chunks.values()].find((item) => x >= item.startX && x <= item.endX);
    return chunk ? this.interpolate(chunk.points, x) : WORLD_BASELINE_Y;
  }

  collectNear(x: number, y: number, radius: number): Collectible[] {
    const collected: Collectible[] = [];
    const radiusSquared = radius * radius;
    for (const chunk of this.chunks.values()) {
      if (x < chunk.startX - radius || x > chunk.endX + radius) continue;
      for (const collectible of chunk.collectibles) {
        if (!collectible.active) continue;
        const dx = collectible.x - x;
        const dy = collectible.y - y;
        if (dx * dx + dy * dy > radiusSquared) continue;
        collectible.active = false;
        collected.push(collectible);
      }
    }
    return collected;
  }

  get collisionBodies(): Body[] {
    return [...this.chunks.values()].flatMap((chunk) => chunk.bodies);
  }

  get activeChunks(): TerrainChunk[] {
    return [...this.chunks.values()].sort((a, b) => a.index - b.index);
  }

  get worldBodyCount(): number {
    return Composite.allBodies(this.engine.world).length;
  }

  dispose(): void {
    for (const chunk of this.chunks.values()) World.remove(this.engine.world, chunk.bodies);
    this.chunks.clear();
  }
}
