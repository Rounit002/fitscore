import type { Body, Constraint } from 'matter-js';

export type Screen = 'menu' | 'garage' | 'upgrades' | 'stages' | 'settings' | 'playing' | 'paused' | 'gameover';
export type UpgradeKey = 'engine' | 'grip' | 'suspension' | 'fuel';
export type VehicleKind = 'jeep' | 'bike' | 'monster' | 'rally' | 'tractor' | 'buggy';
export type StageKind = 'countryside' | 'desert' | 'snow' | 'moon' | 'mars';

export interface VehicleConfig {
  id: string;
  name: string;
  kind: VehicleKind;
  tagline: string;
  unlockCost: number;
  color: string;
  accent: string;
  bodyWidth: number;
  bodyHeight: number;
  wheelBase: number;
  wheelRadius: number;
  suspensionLength: number;
  mass: number;
  wheelMass: number;
  engineTorque: number;
  maxWheelSpeed: number;
  airTorque: number;
  fuelCapacity: number;
  stats: Record<UpgradeKey, number>;
}

export interface StagePalette {
  skyTop: string;
  skyBottom: string;
  sun: string;
  far: string;
  mid: string;
  ground: string;
  groundDark: string;
  surface: string;
  foliage: string;
}

export interface StageConfig {
  id: StageKind;
  name: string;
  subtitle: string;
  unlockCost: number;
  gravity: number;
  grip: number;
  hillScale: number;
  roughness: number;
  fuelEveryChunks: number;
  palette: StagePalette;
}

export interface UpgradeLevels extends Record<UpgradeKey, number> {}

export interface Settings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  reducedMotion: boolean;
}

export interface AchievementState {
  unlocked: boolean;
  progress: number;
  unlockedAt?: number;
}

export interface SaveData {
  version: 1;
  coins: number;
  lifetimeCoins: number;
  bestDistance: number;
  selectedVehicle: string;
  selectedStage: StageKind;
  unlockedVehicles: string[];
  unlockedStages: StageKind[];
  upgrades: Record<string, UpgradeLevels>;
  achievements: Record<string, AchievementState>;
  settings: Settings;
}

export interface TerrainPoint { x: number; y: number }

export interface Collectible {
  id: number;
  type: 'coin' | 'fuel';
  x: number;
  y: number;
  value: number;
  active: boolean;
  phase: number;
}

export interface Decoration {
  x: number;
  y: number;
  type: 'tree' | 'rock' | 'flower' | 'bush' | 'crystal';
  scale: number;
}

export interface TerrainChunk {
  index: number;
  startX: number;
  endX: number;
  points: TerrainPoint[];
  bodies: Body[];
  collectibles: Collectible[];
  decorations: Decoration[];
}

export interface VehicleBodies {
  chassis: Body;
  rearWheel: Body;
  frontWheel: Body;
  headSensor: Body;
  constraints: Constraint[];
}

export interface RunStats {
  distance: number;
  runCoins: number;
  pickupCoins: number;
  airtimeBonus: number;
  flipBonus: number;
  totalAirtime: number;
  flips: number;
  bestAirtime: number;
}

export interface RunSummary extends RunStats {
  bestDistance: number;
  reason: string;
  totalEarned: number;
}

export interface InputState {
  gas: boolean;
  brake: boolean;
}

export interface DebugSnapshot {
  fps: number;
  speed: number;
  angularVelocity: number;
  bodyCount: number;
  chunkCount: number;
  rearContact: boolean;
  frontContact: boolean;
}
