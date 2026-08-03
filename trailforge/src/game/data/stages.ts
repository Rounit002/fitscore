import type { StageConfig, StageKind } from '../types';

export const STAGES: StageConfig[] = [
  {
    id: 'countryside', name: 'Sunmeadow', subtitle: 'Rolling green hills and forgiving grip.', unlockCost: 0,
    gravity: 1, grip: 1, hillScale: 0.82, roughness: 0.7, fuelEveryChunks: 4,
    palette: { skyTop: '#56bdf5', skyBottom: '#dff6ff', sun: '#ffe27a', far: '#8ac7d1', mid: '#5d9d7d', ground: '#825236', groundDark: '#563422', surface: '#57c969', foliage: '#2e8b57' },
  },
  {
    id: 'desert', name: 'Ember Dunes', subtitle: 'Long sandy waves with softer traction.', unlockCost: 900,
    gravity: 0.96, grip: 0.87, hillScale: 1.08, roughness: 0.64, fuelEveryChunks: 4,
    palette: { skyTop: '#4bbbd4', skyBottom: '#ffe1a1', sun: '#fff0a0', far: '#d99c62', mid: '#b86d49', ground: '#b96536', groundDark: '#763a28', surface: '#efb552', foliage: '#518f63' },
  },
  {
    id: 'snow', name: 'Frostpeak', subtitle: 'Sharp ridgelines and slippery snow.', unlockCost: 1600,
    gravity: 1.02, grip: 0.74, hillScale: 1.14, roughness: 0.86, fuelEveryChunks: 4,
    palette: { skyTop: '#5979bb', skyBottom: '#e6f5ff', sun: '#e9f7ff', far: '#a7bde1', mid: '#7188ad', ground: '#617187', groundDark: '#354259', surface: '#f5fbff', foliage: '#315d65' },
  },
  {
    id: 'moon', name: 'Luna Vale', subtitle: 'Low gravity, giant air, cautious landings.', unlockCost: 2800,
    gravity: 0.46, grip: 0.82, hillScale: 1.28, roughness: 1.03, fuelEveryChunks: 5,
    palette: { skyTop: '#080d25', skyBottom: '#283052', sun: '#d9e5ff', far: '#303957', mid: '#515a76', ground: '#686a78', groundDark: '#373845', surface: '#a5a8b5', foliage: '#88d8e6' },
  },
  {
    id: 'mars', name: 'Red Frontier', subtitle: 'Lower gravity over technical red rock.', unlockCost: 4200,
    gravity: 0.62, grip: 0.92, hillScale: 1.35, roughness: 1.12, fuelEveryChunks: 5,
    palette: { skyTop: '#4f2740', skyBottom: '#e88b6d', sun: '#ffd79e', far: '#8c4650', mid: '#743a43', ground: '#8f3d2e', groundDark: '#54251f', surface: '#d06643', foliage: '#91b368' },
  },
];

export const getStage = (id: StageKind): StageConfig => STAGES.find((stage) => stage.id === id) ?? STAGES[0];
