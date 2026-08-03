import { SAVE_KEY } from '../core/constants';
import { ACHIEVEMENTS } from '../data/achievements';
import { defaultUpgradeLevels, VEHICLES } from '../data/vehicles';
import type { SaveData, Settings, StageKind, UpgradeKey } from '../types';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const defaultSettings = (): Settings => ({
  musicVolume: 0.34,
  sfxVolume: 0.72,
  muted: false,
  reducedMotion: typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
});

export const createDefaultSave = (): SaveData => ({
  version: 1,
  coins: 300,
  lifetimeCoins: 0,
  bestDistance: 0,
  selectedVehicle: 'trailblazer',
  selectedStage: 'countryside',
  unlockedVehicles: ['trailblazer'],
  unlockedStages: ['countryside'],
  upgrades: Object.fromEntries(VEHICLES.map((vehicle) => [vehicle.id, defaultUpgradeLevels()])),
  achievements: Object.fromEntries(ACHIEVEMENTS.map((achievement) => [achievement.id, { unlocked: false, progress: 0 }])),
  settings: defaultSettings(),
});

const safeNumber = (value: unknown, fallback: number): number => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export class SaveSystem {
  private data: SaveData;

  constructor(private readonly storage: StorageLike = window.localStorage) {
    this.data = this.read();
  }

  get snapshot(): SaveData {
    return structuredClone(this.data);
  }

  private read(): SaveData {
    const defaults = createDefaultSave();
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      const unlockedVehicles = Array.isArray(parsed.unlockedVehicles) ? parsed.unlockedVehicles.filter((id): id is string => typeof id === 'string') : defaults.unlockedVehicles;
      const unlockedStages = Array.isArray(parsed.unlockedStages) ? parsed.unlockedStages.filter((id): id is StageKind => typeof id === 'string') : defaults.unlockedStages;
      const upgrades = { ...defaults.upgrades };
      for (const vehicle of VEHICLES) {
        const incoming = parsed.upgrades?.[vehicle.id];
        if (!incoming) continue;
        upgrades[vehicle.id] = {
          engine: Math.max(1, Math.min(20, safeNumber(incoming.engine, 1))),
          grip: Math.max(1, Math.min(20, safeNumber(incoming.grip, 1))),
          suspension: Math.max(1, Math.min(20, safeNumber(incoming.suspension, 1))),
          fuel: Math.max(1, Math.min(20, safeNumber(incoming.fuel, 1))),
        };
      }
      return {
        ...defaults,
        ...parsed,
        version: 1,
        coins: Math.max(0, safeNumber(parsed.coins, defaults.coins)),
        lifetimeCoins: Math.max(0, safeNumber(parsed.lifetimeCoins, defaults.lifetimeCoins)),
        bestDistance: Math.max(0, safeNumber(parsed.bestDistance, defaults.bestDistance)),
        unlockedVehicles: [...new Set(['trailblazer', ...unlockedVehicles])],
        unlockedStages: [...new Set<StageKind>(['countryside', ...unlockedStages])],
        upgrades,
        achievements: { ...defaults.achievements, ...(parsed.achievements ?? {}) },
        settings: { ...defaults.settings, ...(parsed.settings ?? {}) },
      };
    } catch {
      return defaults;
    }
  }

  private persist(): void {
    this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
  }

  update(mutator: (data: SaveData) => void): SaveData {
    mutator(this.data);
    this.persist();
    return this.snapshot;
  }

  addCoins(amount: number): SaveData {
    const rounded = Math.max(0, Math.round(amount));
    return this.update((data) => {
      data.coins += rounded;
      data.lifetimeCoins += rounded;
    });
  }

  spendCoins(amount: number): boolean {
    const rounded = Math.max(0, Math.round(amount));
    if (this.data.coins < rounded) return false;
    this.update((data) => { data.coins -= rounded; });
    return true;
  }

  selectVehicle(id: string): void {
    if (!this.data.unlockedVehicles.includes(id)) return;
    this.update((data) => { data.selectedVehicle = id; });
  }

  selectStage(id: StageKind): void {
    if (!this.data.unlockedStages.includes(id)) return;
    this.update((data) => { data.selectedStage = id; });
  }

  unlockVehicle(id: string, cost: number): boolean {
    if (this.data.unlockedVehicles.includes(id)) return true;
    if (!this.spendCoins(cost)) return false;
    this.update((data) => { data.unlockedVehicles.push(id); });
    return true;
  }

  unlockStage(id: StageKind, cost: number): boolean {
    if (this.data.unlockedStages.includes(id)) return true;
    if (!this.spendCoins(cost)) return false;
    this.update((data) => { data.unlockedStages.push(id); });
    return true;
  }

  setUpgrade(vehicleId: string, key: UpgradeKey, level: number): void {
    this.update((data) => { data.upgrades[vehicleId][key] = Math.max(1, Math.min(20, level)); });
  }

  setBestDistance(distance: number): void {
    if (distance <= this.data.bestDistance) return;
    this.update((data) => { data.bestDistance = distance; });
  }

  setSettings(settings: Partial<Settings>): void {
    this.update((data) => { data.settings = { ...data.settings, ...settings }; });
  }

  reset(): SaveData {
    this.storage.removeItem(SAVE_KEY);
    this.data = createDefaultSave();
    this.persist();
    return this.snapshot;
  }
}
