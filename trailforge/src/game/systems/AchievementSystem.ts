import { ACHIEVEMENTS, type AchievementDefinition } from '../data/achievements';
import type { SaveData } from '../types';
import { SaveSystem } from './SaveSystem';

export class AchievementSystem {
  constructor(
    private readonly save: SaveSystem,
    private readonly onUnlock: (achievement: AchievementDefinition) => void,
  ) {}

  setProgress(id: string, progress: number): void {
    const definition = ACHIEVEMENTS.find((item) => item.id === id);
    if (!definition) return;
    const current = this.save.snapshot.achievements[id];
    if (current?.unlocked) return;
    const nextProgress = Math.max(current?.progress ?? 0, progress);
    if (nextProgress < definition.target) {
      this.save.update((data) => { data.achievements[id].progress = nextProgress; });
      return;
    }
    this.save.update((data) => {
      data.achievements[id] = { unlocked: true, progress: definition.target, unlockedAt: Date.now() };
      data.coins += definition.reward;
      data.lifetimeCoins += definition.reward;
    });
    this.onUnlock(definition);
  }

  syncMetaProgress(data: SaveData): void {
    this.setProgress('coin_1000', data.lifetimeCoins);
    this.setProgress('three_vehicles', data.unlockedVehicles.length);
    const highestUpgrade = Math.max(...Object.values(data.upgrades).flatMap((levels) => Object.values(levels) as number[]));
    this.setProgress('max_upgrade', highestUpgrade);
  }
}
