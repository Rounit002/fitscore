import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../core/constants';
import { upgradeCost } from '../data/vehicles';
import { SaveSystem } from './SaveSystem';

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

describe('SaveSystem', () => {
  it('persists currency, selections, and upgrades across instances', () => {
    const storage = new MemoryStorage();
    const first = new SaveSystem(storage);
    first.addCoins(700);
    expect(first.unlockVehicle('sparrow', 800)).toBe(true);
    first.selectVehicle('sparrow');
    first.setUpgrade('sparrow', 'engine', 7);
    first.setBestDistance(1234);

    const reloaded = new SaveSystem(storage);
    expect(reloaded.snapshot.selectedVehicle).toBe('sparrow');
    expect(reloaded.snapshot.upgrades.sparrow.engine).toBe(7);
    expect(reloaded.snapshot.bestDistance).toBe(1234);
    expect(reloaded.snapshot.unlockedVehicles).toContain('sparrow');
  });

  it('recovers from malformed storage without losing required defaults', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{not valid json');
    const save = new SaveSystem(storage);
    expect(save.snapshot.unlockedVehicles).toEqual(['trailblazer']);
    expect(save.snapshot.unlockedStages).toEqual(['countryside']);
    expect(save.snapshot.coins).toBeGreaterThan(0);
  });

  it('uses a steadily increasing but playable upgrade curve', () => {
    expect(upgradeCost('engine', 1)).toBe(90);
    expect(upgradeCost('engine', 10)).toBeGreaterThan(upgradeCost('engine', 5));
    expect(upgradeCost('engine', 19)).toBeLessThan(10_000);
  });
});
