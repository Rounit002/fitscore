import type { Settings } from '../types';

type SoundName = 'click' | 'coin' | 'fuel' | 'landing' | 'crash' | 'reward' | 'achievement' | 'gameover';

const soundNotes: Record<SoundName, [number, number, OscillatorType]> = {
  click: [330, 0.045, 'sine'],
  coin: [880, 0.1, 'triangle'],
  fuel: [440, 0.22, 'square'],
  landing: [95, 0.12, 'sine'],
  crash: [62, 0.42, 'sawtooth'],
  reward: [660, 0.25, 'triangle'],
  achievement: [740, 0.45, 'sine'],
  gameover: [155, 0.7, 'triangle'],
};

export class AudioSystem {
  private context: AudioContext | null = null;
  private engineOscillator: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private musicTimer = 0;
  private musicStep = 0;

  constructor(private settings: Settings) {}

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return null;
    const context = new AudioContextClass();
    this.context = context;
    this.musicGain = context.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(context.destination);
    this.engineGain = context.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter = context.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 520;
    this.engineGain.connect(this.engineFilter);
    this.engineFilter.connect(context.destination);
    this.engineOscillator = context.createOscillator();
    this.engineOscillator.type = 'sawtooth';
    this.engineOscillator.frequency.value = 70;
    this.engineOscillator.connect(this.engineGain);
    this.engineOscillator.start();
    this.applyVolumes();
    return context;
  }

  async unlock(): Promise<void> {
    const context = this.ensureContext();
    if (context?.state === 'suspended') await context.resume();
  }

  setSettings(settings: Settings): void {
    this.settings = settings;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.context || !this.musicGain) return;
    const now = this.context.currentTime;
    const music = this.settings.muted ? 0 : this.settings.musicVolume * 0.11;
    this.musicGain.gain.setTargetAtTime(music, now, 0.05);
  }

  updateEngine(rpm: number, throttle: number, active: boolean): void {
    const context = this.ensureContext();
    if (!context || !this.engineOscillator || !this.engineGain || !this.engineFilter) return;
    const now = context.currentTime;
    const normalized = Math.min(1, Math.abs(rpm) / 0.6);
    this.engineOscillator.frequency.setTargetAtTime(58 + normalized * 185 + throttle * 32, now, 0.035);
    this.engineFilter.frequency.setTargetAtTime(340 + normalized * 1150, now, 0.055);
    const volume = active && !this.settings.muted ? this.settings.sfxVolume * (0.035 + throttle * 0.04) : 0;
    this.engineGain.gain.setTargetAtTime(volume, now, active ? 0.04 : 0.12);
  }

  updateMusic(deltaSeconds: number): void {
    if (this.settings.muted || this.settings.musicVolume <= 0) return;
    this.musicTimer -= deltaSeconds;
    if (this.musicTimer > 0) return;
    this.musicTimer = 0.42;
    const notes = [196, 247, 294, 370, 294, 247, 220, 277];
    this.note(notes[this.musicStep % notes.length], 0.23, 'sine', this.settings.musicVolume * 0.035, true);
    this.musicStep += 1;
  }

  play(name: SoundName): void {
    const [frequency, duration, type] = soundNotes[name];
    this.note(frequency, duration, type, this.settings.sfxVolume * 0.16, false);
    if (name === 'coin' || name === 'achievement') {
      window.setTimeout(() => this.note(frequency * 1.5, duration * 0.7, 'triangle', this.settings.sfxVolume * 0.11, false), 55);
    }
  }

  private note(frequency: number, duration: number, type: OscillatorType, volume: number, music: boolean): void {
    if (this.settings.muted) return;
    const context = this.ensureContext();
    const destination = music ? this.musicGain : context?.destination;
    if (!context || !destination || context.state === 'suspended') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    if (type === 'sawtooth') oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, frequency * 0.55), context.currentTime + duration);
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), context.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.03);
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
