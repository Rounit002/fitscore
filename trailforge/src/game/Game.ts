import { Engine } from 'matter-js';
import { PX_PER_METER, START_X } from './core/constants';
import { AchievementSystem } from './systems/AchievementSystem';
import { AudioSystem } from './systems/AudioSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { SaveSystem } from './systems/SaveSystem';
import { TerrainGenerator } from './systems/TerrainGenerator';
import { getStage, STAGES } from './data/stages';
import { getVehicle, upgradeCost, VEHICLES } from './data/vehicles';
import { Vehicle } from './entities/Vehicle';
import { GameRenderer } from './render/GameRenderer';
import { UIManager, type UIActions } from './ui/UIManager';
import type { DebugSnapshot, InputState, RunStats, RunSummary, Screen, Settings, StageKind, UpgradeKey } from './types';

const angleDelta = (current: number, previous: number): number => Math.atan2(Math.sin(current - previous), Math.cos(current - previous));

export class Game {
  private engine = Engine.create({ enableSleeping: false });
  private terrain: TerrainGenerator;
  private vehicle: Vehicle | null = null;
  private readonly save = new SaveSystem();
  private readonly particles = new ParticleSystem();
  private readonly audio: AudioSystem;
  private readonly renderer: GameRenderer;
  private readonly ui: UIManager;
  private readonly achievements: AchievementSystem;
  private screen: Screen = 'menu';
  private readonly keyboardInput: InputState = { gas: false, brake: false };
  private touchInput: InputState = { gas: false, brake: false };
  private fuel = 100;
  private runStartX = START_X;
  private runTime = 0;
  private stats: RunStats = this.emptyStats();
  private airborne = false;
  private airtime = 0;
  private lastAirAngle = 0;
  private airRotation = 0;
  private countedFlips = 0;
  private upsideDownTimer = 0;
  private fuelStoppedTimer = 0;
  private stuckTimer = 0;
  private endingTimer = 0;
  private endingReason = '';
  private debug = false;
  private lastTimestamp = performance.now();
  private fps = 60;
  private elapsed = 0;
  private dustTimer = 0;

  constructor(root: HTMLElement) {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', 'TrailForge physics game world');
    canvas.setAttribute('role', 'img');
    root.append(canvas);
    this.renderer = new GameRenderer(canvas, this.particles);
    this.audio = new AudioSystem(this.save.snapshot.settings);
    this.ui = new UIManager(root, this.createUIActions());
    this.achievements = new AchievementSystem(this.save, (achievement) => {
      this.audio.play('achievement');
      this.ui.achievementToast(achievement);
    });
    this.terrain = new TerrainGenerator(this.engine, getStage(this.save.snapshot.selectedStage));
    this.installEvents();
    this.showMenu();
    requestAnimationFrame((timestamp) => this.frame(timestamp));
  }

  private createUIActions(): UIActions {
    return {
      play: () => this.startRun(),
      pause: () => this.pause(),
      open: (screen) => this.openScreen(screen),
      resume: () => this.resume(),
      restart: () => this.startRun(),
      retry: () => this.startRun(),
      mainMenu: () => this.showMenu(true),
      garage: () => { this.abandonRun(); this.openScreen('garage'); },
      selectVehicle: (id) => this.selectVehicle(id),
      unlockVehicle: (id) => this.unlockVehicle(id),
      selectStage: (id) => this.selectStage(id),
      unlockStage: (id) => this.unlockStage(id),
      buyUpgrade: (key) => this.buyUpgrade(key),
      updateSettings: (settings) => this.updateSettings(settings),
      resetProgress: () => this.resetProgress(),
      controls: (input) => { this.touchInput = input; },
      unlockAudio: () => { void this.audio.unlock(); },
    };
  }

  private installEvents(): void {
    window.addEventListener('resize', () => this.renderer.resize());
    window.addEventListener('blur', () => {
      this.keyboardInput.gas = false;
      this.keyboardInput.brake = false;
      if (this.screen === 'playing') this.pause();
    });
    window.addEventListener('keydown', (event) => {
      if (event.code === 'F3' || event.code === 'Backquote') {
        event.preventDefault();
        this.debug = !this.debug;
        this.ui.notify(`Physics debug ${this.debug ? 'enabled' : 'disabled'}`);
        return;
      }
      if (event.code === 'Escape') {
        event.preventDefault();
        if (this.screen === 'playing') this.pause(); else if (this.screen === 'paused') this.resume();
        return;
      }
      if (this.screen !== 'playing') return;
      if (event.code === 'KeyD' || event.code === 'ArrowRight') { event.preventDefault(); this.keyboardInput.gas = true; }
      if (event.code === 'KeyA' || event.code === 'ArrowLeft') { event.preventDefault(); this.keyboardInput.brake = true; }
    });
    window.addEventListener('keyup', (event) => {
      if (event.code === 'KeyD' || event.code === 'ArrowRight') this.keyboardInput.gas = false;
      if (event.code === 'KeyA' || event.code === 'ArrowLeft') this.keyboardInput.brake = false;
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.screen === 'playing') this.pause(); });
    document.addEventListener('contextmenu', (event) => { if (this.screen === 'playing') event.preventDefault(); });
  }

  private frame(timestamp: number): void {
    const rawDelta = Math.min(50, Math.max(0, timestamp - this.lastTimestamp));
    this.lastTimestamp = timestamp;
    const deltaSeconds = rawDelta / 1000;
    this.elapsed += deltaSeconds;
    this.fps += ((rawDelta > 0 ? 1000 / rawDelta : 60) - this.fps) * 0.08;

    if (this.screen === 'playing' && this.vehicle) this.updateRun(deltaSeconds, rawDelta);
    else if (this.endingTimer > 0 && this.vehicle) this.updateEnding(deltaSeconds, rawDelta);
    else this.audio.updateEngine(0, 0, false);
    this.audio.updateMusic(deltaSeconds);
    this.render();
    requestAnimationFrame((nextTimestamp) => this.frame(nextTimestamp));
  }

  private render(): void {
    const save = this.save.snapshot;
    const stage = getStage(save.selectedStage);
    if (this.vehicle && (this.screen === 'playing' || this.screen === 'paused' || this.endingTimer > 0 || this.screen === 'gameover')) {
      const debugSnapshot: DebugSnapshot = {
        fps: this.fps,
        speed: this.vehicle.speed,
        angularVelocity: this.vehicle.bodies.chassis.angularVelocity,
        bodyCount: this.terrain.worldBodyCount,
        chunkCount: this.terrain.activeChunks.length,
        rearContact: this.vehicle.rearContact,
        frontContact: this.vehicle.frontContact,
      };
      this.renderer.drawWorld(stage, this.terrain.activeChunks, this.vehicle, this.elapsed, this.debug, debugSnapshot);
    } else {
      this.renderer.drawMenu(stage, getVehicle(save.selectedVehicle), this.elapsed);
    }
  }

  private startRun(): void {
    this.abandonRun();
    const save = this.save.snapshot;
    const stage = getStage(save.selectedStage);
    this.engine = Engine.create({ enableSleeping: false });
    this.engine.gravity.y = stage.gravity;
    this.engine.gravity.scale = 0.001;
    this.terrain = new TerrainGenerator(this.engine, stage);
    this.terrain.reset(stage);
    const config = getVehicle(save.selectedVehicle);
    const spawnY = this.terrain.heightAt(START_X) - config.wheelRadius - config.suspensionLength - config.bodyHeight * 0.48 - 3;
    this.vehicle = new Vehicle(this.engine, config, save.upgrades[config.id], stage, START_X, spawnY);
    this.fuel = this.vehicle.fuelCapacity;
    this.runStartX = START_X;
    this.runTime = 0;
    this.stats = this.emptyStats();
    this.airborne = false;
    this.airtime = 0;
    this.airRotation = 0;
    this.countedFlips = 0;
    this.upsideDownTimer = 0;
    this.fuelStoppedTimer = 0;
    this.stuckTimer = 0;
    this.endingTimer = 0;
    this.endingReason = '';
    this.particles.clear();
    this.keyboardInput.gas = false;
    this.keyboardInput.brake = false;
    this.touchInput = { gas: false, brake: false };
    this.renderer.snapCamera(START_X - this.renderer.width * 0.38, spawnY - this.renderer.height * 0.53);
    this.screen = 'playing';
    this.ui.showGameplay();
    this.ui.updateHud(0, 0, 1);
    this.audio.play('click');
  }

  private updateRun(deltaSeconds: number, deltaMs: number): void {
    const vehicle = this.vehicle!;
    this.runTime += deltaSeconds;
    const input = this.currentInput();
    if (this.fuel <= 0) input.gas = false;
    this.terrain.ensureAround(this.renderer.camera.x, this.renderer.width);
    vehicle.update(input, this.terrain.collisionBodies);
    Engine.update(this.engine, Math.min(deltaMs, 33.33));
    this.renderer.follow(vehicle, deltaSeconds, this.save.snapshot.settings.reducedMotion);
    this.terrain.ensureAround(this.renderer.camera.x, this.renderer.width);
    this.particles.update(deltaSeconds);

    const position = vehicle.bodies.chassis.position;
    this.stats.distance = Math.max(this.stats.distance, Math.max(0, (position.x - this.runStartX) / PX_PER_METER));
    const fuelDrain = (0.34 + (input.gas ? 0.44 : 0.08)) * deltaSeconds;
    this.fuel = Math.max(0, this.fuel - fuelDrain);
    this.handleCollectibles();
    this.handleAirTime(deltaSeconds);
    this.handleDust(deltaSeconds, input);
    this.handleCrashConditions(deltaSeconds);
    this.audio.updateEngine(vehicle.averageWheelSpeed, input.gas ? 1 : 0, true);
    this.ui.updateHud(this.stats.distance, this.stats.runCoins, this.fuel / vehicle.fuelCapacity);
  }

  private currentInput(): InputState {
    return { gas: this.keyboardInput.gas || this.touchInput.gas, brake: this.keyboardInput.brake || this.touchInput.brake };
  }

  private handleCollectibles(): void {
    const vehicle = this.vehicle!;
    const position = vehicle.bodies.chassis.position;
    const collected = this.terrain.collectNear(position.x, position.y, Math.max(47, vehicle.config.wheelRadius + 24));
    for (const item of collected) {
      if (item.type === 'coin') {
        this.stats.pickupCoins += item.value;
        this.stats.runCoins += item.value;
        this.particles.burst(item.x, item.y, item.value >= 10 ? '#ffd94a' : '#fff2ad', 8, 2.6);
        this.audio.play('coin');
      } else {
        this.fuel = Math.min(vehicle.fuelCapacity, this.fuel + vehicle.fuelCapacity * (item.value / 100));
        this.particles.burst(item.x, item.y, '#ff6258', 14, 3.3);
        this.audio.play('fuel');
        this.ui.flashBonus('FUEL UP!', `+${item.value}% tank`);
      }
    }
  }

  private handleAirTime(deltaSeconds: number): void {
    const vehicle = this.vehicle!;
    const grounded = vehicle.grounded;
    if (!grounded && this.runTime > 1.2) {
      if (!this.airborne) {
        this.airborne = true;
        this.airtime = 0;
        this.airRotation = 0;
        this.countedFlips = 0;
        this.lastAirAngle = vehicle.bodies.chassis.angle;
      }
      this.airtime += deltaSeconds;
      const angle = vehicle.bodies.chassis.angle;
      this.airRotation += angleDelta(angle, this.lastAirAngle);
      this.lastAirAngle = angle;
      const flipsNow = Math.floor(Math.abs(this.airRotation) / (Math.PI * 2 * 0.92));
      if (flipsNow > this.countedFlips) {
        const newFlips = flipsNow - this.countedFlips;
        const reward = newFlips * 100;
        const frontFlip = this.airRotation > 0;
        this.countedFlips = flipsNow;
        this.stats.flips += newFlips;
        this.stats.flipBonus += reward;
        this.stats.runCoins += reward;
        this.ui.flashBonus(frontFlip ? 'FRONTFLIP!' : 'BACKFLIP!', `+${reward} coins`);
        this.audio.play('reward');
        this.achievements.setProgress('first_flip', this.stats.flips);
      }
      return;
    }
    if (!this.airborne) return;
    this.airborne = false;
    this.stats.totalAirtime += this.airtime;
    this.stats.bestAirtime = Math.max(this.stats.bestAirtime, this.airtime);
    const reward = this.airtime >= 3 ? 150 : this.airtime >= 2 ? 75 : this.airtime >= 1 ? 25 : this.airtime >= 0.5 ? 10 : 0;
    if (reward > 0) {
      const title = this.airtime >= 3 ? 'INSANE AIR!' : this.airtime >= 2 ? 'BIG AIR!' : 'AIR TIME!';
      this.stats.airtimeBonus += reward;
      this.stats.runCoins += reward;
      this.ui.flashBonus(title, `${this.airtime.toFixed(1)}s · +${reward} coins`);
      this.audio.play('reward');
    }
    if (this.airtime > 0.22) {
      const position = vehicle.bodies.chassis.position;
      this.particles.burst(position.x, this.terrain.heightAt(position.x) - 5, '#d8bc8d', Math.min(16, 5 + Math.floor(this.airtime * 3)), 2.7);
      this.audio.play('landing');
      if ('vibrate' in navigator && this.airtime > 0.7) navigator.vibrate(12);
    }
    this.achievements.setProgress('air_three', this.stats.bestAirtime);
    this.airtime = 0;
  }

  private handleDust(deltaSeconds: number, input: InputState): void {
    const vehicle = this.vehicle!;
    this.dustTimer -= deltaSeconds;
    if (this.dustTimer > 0 || !vehicle.grounded || (!input.gas && vehicle.speed < 2)) return;
    this.dustTimer = this.save.snapshot.settings.reducedMotion ? 0.18 : 0.065;
    const wheel = vehicle.bodies.rearWheel;
    this.particles.dust(wheel.position.x, wheel.position.y + vehicle.config.wheelRadius * 0.75, Math.sign(vehicle.bodies.chassis.velocity.x || 1));
  }

  private handleCrashConditions(deltaSeconds: number): void {
    const vehicle = this.vehicle!;
    const terrainBodies = this.terrain.collisionBodies;
    if (this.runTime > 1.4 && vehicle.headTouches(terrainBodies) && (vehicle.speed > 1.55 || Math.abs(vehicle.bodies.chassis.angularVelocity) > 0.038)) {
      this.beginGameOver('Driver impact');
      return;
    }
    if (vehicle.upsideDown && vehicle.grounded) this.upsideDownTimer += deltaSeconds; else this.upsideDownTimer = Math.max(0, this.upsideDownTimer - deltaSeconds * 1.8);
    if (this.upsideDownTimer > 2.35) { this.beginGameOver('Vehicle overturned'); return; }

    if (this.fuel <= 0 && vehicle.speed < 0.7) this.fuelStoppedTimer += deltaSeconds; else this.fuelStoppedTimer = 0;
    if (this.fuelStoppedTimer > 2.8) { this.beginGameOver('Out of fuel'); return; }

    if (this.stats.distance > 18 && this.currentInput().gas && vehicle.grounded && vehicle.speed < 0.38) this.stuckTimer += deltaSeconds; else this.stuckTimer = Math.max(0, this.stuckTimer - deltaSeconds * 2);
    if (this.stuckTimer > 8) { this.beginGameOver('Permanently stuck'); return; }

    const position = vehicle.bodies.chassis.position;
    if (position.y > this.terrain.heightAt(position.x) + 760) this.beginGameOver('Lost below the trail');
  }

  private beginGameOver(reason: string): void {
    if (this.endingTimer > 0 || this.screen !== 'playing') return;
    this.endingReason = reason;
    this.endingTimer = 0.68;
    this.screen = 'gameover';
    this.keyboardInput.gas = false;
    this.keyboardInput.brake = false;
    this.touchInput = { gas: false, brake: false };
    this.audio.play(reason === 'Out of fuel' ? 'gameover' : 'crash');
    this.audio.updateEngine(0, 0, false);
    const position = this.vehicle!.bodies.chassis.position;
    this.particles.burst(position.x, position.y, '#ff6c63', 22, 4.2);
    if ('vibrate' in navigator) navigator.vibrate([35, 30, 55]);
  }

  private updateEnding(deltaSeconds: number, deltaMs: number): void {
    this.endingTimer -= deltaSeconds;
    Engine.update(this.engine, Math.min(deltaMs, 33.33) * 0.24);
    this.particles.update(deltaSeconds);
    this.renderer.follow(this.vehicle!, deltaSeconds, this.save.snapshot.settings.reducedMotion);
    if (this.endingTimer <= 0) this.finishGameOver();
  }

  private finishGameOver(): void {
    const distanceCoins = Math.floor(this.stats.distance / 35);
    const totalEarned = this.stats.pickupCoins + this.stats.airtimeBonus + this.stats.flipBonus + distanceCoins;
    this.save.addCoins(totalEarned);
    this.save.setBestDistance(this.stats.distance);
    this.achievements.setProgress('first_km', this.stats.distance);
    this.achievements.setProgress('five_km', this.stats.distance);
    this.achievements.syncMetaProgress(this.save.snapshot);
    const summary: RunSummary = { ...this.stats, bestDistance: this.save.snapshot.bestDistance, reason: this.endingReason, totalEarned };
    this.screen = 'gameover';
    this.ui.showGameOver(summary);
    this.audio.play('gameover');
  }

  private pause(): void {
    if (this.screen !== 'playing') return;
    this.screen = 'paused';
    this.keyboardInput.gas = false;
    this.keyboardInput.brake = false;
    this.touchInput = { gas: false, brake: false };
    this.audio.updateEngine(0, 0, false);
    this.ui.showPause(this.save.snapshot.settings);
  }

  private resume(): void {
    if (this.screen !== 'paused') return;
    this.screen = 'playing';
    this.lastTimestamp = performance.now();
    this.ui.hidePause();
  }

  private openScreen(screen: 'menu' | 'garage' | 'upgrades' | 'stages' | 'settings'): void {
    if (screen === 'menu') { this.showMenu(true); return; }
    if (this.vehicle) this.abandonRun();
    this.screen = screen;
    const save = this.save.snapshot;
    if (screen === 'garage') this.ui.showGarage(save);
    else if (screen === 'upgrades') this.ui.showUpgrades(save);
    else if (screen === 'stages') this.ui.showStages(save);
    else this.ui.showSettings(save);
    this.audio.play('click');
  }

  private showMenu(abandon = false): void {
    if (abandon) this.abandonRun();
    this.screen = 'menu';
    this.ui.showMenu(this.save.snapshot);
    this.audio.updateEngine(0, 0, false);
  }

  private selectVehicle(id: string): void {
    this.save.selectVehicle(id);
    this.audio.play('click');
    this.ui.showGarage(this.save.snapshot);
  }

  private unlockVehicle(id: string): void {
    const config = VEHICLES.find((vehicle) => vehicle.id === id);
    if (!config) return;
    if (!this.save.unlockVehicle(id, config.unlockCost)) { this.ui.notify('Not enough coins yet.', 'error'); return; }
    this.save.selectVehicle(id);
    this.achievements.syncMetaProgress(this.save.snapshot);
    this.audio.play('reward');
    this.ui.notify(`${config.name} unlocked!`);
    this.ui.showGarage(this.save.snapshot);
  }

  private selectStage(id: StageKind): void {
    this.save.selectStage(id);
    this.audio.play('click');
    this.ui.showStages(this.save.snapshot);
  }

  private unlockStage(id: StageKind): void {
    const stage = STAGES.find((item) => item.id === id);
    if (!stage) return;
    if (!this.save.unlockStage(id, stage.unlockCost)) { this.ui.notify('Not enough coins yet.', 'error'); return; }
    this.save.selectStage(id);
    this.audio.play('reward');
    this.ui.notify(`${stage.name} expedition unlocked!`);
    this.ui.showStages(this.save.snapshot);
  }

  private buyUpgrade(key: UpgradeKey): void {
    const data = this.save.snapshot;
    const vehicleId = data.selectedVehicle;
    const currentLevel = data.upgrades[vehicleId][key];
    if (currentLevel >= 20) return;
    const cost = upgradeCost(key, currentLevel);
    if (!this.save.spendCoins(cost)) { this.ui.notify('Not enough coins yet.', 'error'); return; }
    this.save.setUpgrade(vehicleId, key, currentLevel + 1);
    this.achievements.syncMetaProgress(this.save.snapshot);
    this.audio.play('reward');
    this.ui.showUpgrades(this.save.snapshot);
  }

  private updateSettings(settings: Partial<Settings>): void {
    this.save.setSettings(settings);
    this.audio.setSettings(this.save.snapshot.settings);
  }

  private resetProgress(): void {
    if (!window.confirm('Reset every coin, unlock, upgrade, record, and achievement? This cannot be undone.')) return;
    this.save.reset();
    this.audio.setSettings(this.save.snapshot.settings);
    this.ui.notify('Progress reset. Fresh trail, fresh start.');
    this.ui.showSettings(this.save.snapshot);
  }

  private abandonRun(): void {
    this.vehicle?.dispose();
    this.vehicle = null;
    this.terrain.dispose();
    this.endingTimer = 0;
    this.particles.clear();
    this.keyboardInput.gas = false;
    this.keyboardInput.brake = false;
    this.touchInput = { gas: false, brake: false };
  }

  private emptyStats(): RunStats {
    return { distance: 0, runCoins: 0, pickupCoins: 0, airtimeBonus: 0, flipBonus: 0, totalAirtime: 0, flips: 0, bestAirtime: 0 };
  }
}
