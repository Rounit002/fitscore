import type { UpgradeKey, UpgradeLevels, VehicleConfig } from '../types';
import { MAX_UPGRADE_LEVEL } from '../core/constants';

export const VEHICLES: VehicleConfig[] = [
  {
    id: 'trailblazer', name: 'Trailblazer', kind: 'jeep', tagline: 'Balanced, forgiving, ready for anything.', unlockCost: 0,
    color: '#ff7a2f', accent: '#ffd166', bodyWidth: 112, bodyHeight: 34, wheelBase: 82, wheelRadius: 25,
    suspensionLength: 38, mass: 4.7, wheelMass: 1.45, engineTorque: 1, maxWheelSpeed: 0.48, airTorque: 0.033,
    fuelCapacity: 100, stats: { engine: 5, grip: 5, suspension: 5, fuel: 5 },
  },
  {
    id: 'sparrow', name: 'Dust Sparrow', kind: 'bike', tagline: 'Featherlight and eager to rotate.', unlockCost: 1100,
    color: '#31c6f5', accent: '#e6fbff', bodyWidth: 82, bodyHeight: 20, wheelBase: 72, wheelRadius: 21,
    suspensionLength: 34, mass: 2.55, wheelMass: 0.82, engineTorque: 0.87, maxWheelSpeed: 0.61, airTorque: 0.052,
    fuelCapacity: 80, stats: { engine: 8, grip: 4, suspension: 4, fuel: 3 },
  },
  {
    id: 'mammoth', name: 'Mammoth 6X', kind: 'monster', tagline: 'Huge tires. Huge landings. Zero subtlety.', unlockCost: 2600,
    color: '#8d63ff', accent: '#d9ccff', bodyWidth: 128, bodyHeight: 42, wheelBase: 94, wheelRadius: 35,
    suspensionLength: 49, mass: 7.2, wheelMass: 2.25, engineTorque: 1.55, maxWheelSpeed: 0.42, airTorque: 0.024,
    fuelCapacity: 115, stats: { engine: 7, grip: 8, suspension: 9, fuel: 6 },
  },
  {
    id: 'apex', name: 'Apex RS', kind: 'rally', tagline: 'Fast, planted, and happiest at full throttle.', unlockCost: 3200,
    color: '#ff4268', accent: '#fff0f3', bodyWidth: 118, bodyHeight: 27, wheelBase: 88, wheelRadius: 23,
    suspensionLength: 31, mass: 4.2, wheelMass: 1.25, engineTorque: 1.28, maxWheelSpeed: 0.59, airTorque: 0.028,
    fuelCapacity: 92, stats: { engine: 9, grip: 7, suspension: 3, fuel: 4 },
  },
  {
    id: 'ironroot', name: 'Ironroot', kind: 'tractor', tagline: 'Slow, stubborn, and impossible to intimidate.', unlockCost: 1900,
    color: '#57bd62', accent: '#ecffb0', bodyWidth: 120, bodyHeight: 40, wheelBase: 84, wheelRadius: 31,
    suspensionLength: 36, mass: 7.7, wheelMass: 2.1, engineTorque: 1.8, maxWheelSpeed: 0.34, airTorque: 0.021,
    fuelCapacity: 125, stats: { engine: 8, grip: 9, suspension: 5, fuel: 7 },
  },
  {
    id: 'firefly', name: 'Firefly XR', kind: 'buggy', tagline: 'Long travel suspension built for flight.', unlockCost: 2200,
    color: '#ffd43b', accent: '#fff7c2', bodyWidth: 108, bodyHeight: 29, wheelBase: 88, wheelRadius: 27,
    suspensionLength: 49, mass: 3.65, wheelMass: 1.25, engineTorque: 1.08, maxWheelSpeed: 0.54, airTorque: 0.041,
    fuelCapacity: 90, stats: { engine: 7, grip: 6, suspension: 10, fuel: 4 },
  },
];

export const getVehicle = (id: string): VehicleConfig => VEHICLES.find((vehicle) => vehicle.id === id) ?? VEHICLES[0];

export const defaultUpgradeLevels = (): UpgradeLevels => ({ engine: 1, grip: 1, suspension: 1, fuel: 1 });

export const upgradeCost = (key: UpgradeKey, currentLevel: number): number => {
  const base: Record<UpgradeKey, number> = { engine: 90, grip: 75, suspension: 85, fuel: 70 };
  return Math.round((base[key] * Math.pow(currentLevel, 1.48)) / 10) * 10;
};

export const upgradeMultiplier = (level: number, perLevel: number): number => 1 + (Math.min(MAX_UPGRADE_LEVEL, level) - 1) * perLevel;
