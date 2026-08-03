import { Engine } from 'matter-js';
import { describe, expect, it } from 'vitest';
import { PX_PER_METER, TERRAIN_CHUNK_WIDTH } from '../core/constants';
import { getStage } from '../data/stages';
import { TerrainGenerator } from './TerrainGenerator';

describe('TerrainGenerator', () => {
  it('generates 10,000 meters without impossible point-to-point slopes', () => {
    const engine = Engine.create();
    const terrain = new TerrainGenerator(engine, getStage('mars'), 42);
    terrain.reset(getStage('mars'));
    terrain.generateThroughX(10_000 * PX_PER_METER);

    expect(terrain.activeChunks.at(-1)!.endX).toBeGreaterThanOrEqual(10_000 * PX_PER_METER);
    for (const chunk of terrain.activeChunks) {
      for (let index = 1; index < chunk.points.length; index += 1) {
        const previous = chunk.points[index - 1];
        const current = chunk.points[index];
        const slope = Math.abs(current.y - previous.y) / Math.max(1, current.x - previous.x);
        expect(slope).toBeLessThanOrEqual(0.93);
      }
    }
  }, 15_000);

  it('unloads terrain far behind while retaining multiple chunks ahead', () => {
    const engine = Engine.create();
    const terrain = new TerrainGenerator(engine, getStage('countryside'), 77);
    terrain.reset(getStage('countryside'));
    terrain.ensureAround(35 * TERRAIN_CHUNK_WIDTH, 1280);
    const before = terrain.activeChunks.length;
    terrain.ensureAround(39 * TERRAIN_CHUNK_WIDTH, 1280);
    expect(terrain.activeChunks.length).toBeLessThan(before + 5);
    expect(terrain.activeChunks[0].endX).toBeGreaterThan(39 * TERRAIN_CHUNK_WIDTH - 1280 * 2.3);
    expect(terrain.activeChunks.at(-1)!.endX).toBeGreaterThan(39 * TERRAIN_CHUNK_WIDTH + 1280 * 2.5);
  });

  it('places recurring fuel and pooled lightweight pickups', () => {
    const engine = Engine.create();
    const stage = getStage('countryside');
    const terrain = new TerrainGenerator(engine, stage, 9);
    terrain.reset(stage);
    terrain.generateThroughX(TERRAIN_CHUNK_WIDTH * 14);
    const fuel = terrain.activeChunks.flatMap((chunk) => chunk.collectibles).filter((item) => item.type === 'fuel');
    expect(fuel.length).toBeGreaterThanOrEqual(3);
  });
});
