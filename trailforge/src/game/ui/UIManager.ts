import { ACHIEVEMENTS, type AchievementDefinition } from '../data/achievements';
import { STAGES } from '../data/stages';
import { getVehicle, upgradeCost, VEHICLES } from '../data/vehicles';
import type { InputState, RunSummary, SaveData, Screen, Settings, StageKind, UpgradeKey } from '../types';

export interface UIActions {
  play(): void;
  pause(): void;
  open(screen: Exclude<Screen, 'playing' | 'paused' | 'gameover'>): void;
  resume(): void;
  restart(): void;
  retry(): void;
  mainMenu(): void;
  garage(): void;
  selectVehicle(id: string): void;
  unlockVehicle(id: string): void;
  selectStage(id: StageKind): void;
  unlockStage(id: StageKind): void;
  buyUpgrade(key: UpgradeKey): void;
  updateSettings(settings: Partial<Settings>): void;
  resetProgress(): void;
  controls(input: InputState): void;
  unlockAudio(): void;
}

const icon = (name: 'play' | 'garage' | 'upgrade' | 'map' | 'settings' | 'pause' | 'back' | 'lock' | 'coin' | 'fuel' | 'retry' | 'home' | 'check'): string => {
  const paths: Record<typeof name, string> = {
    play: '<path d="m9 7 8 5-8 5V7Z"/>',
    garage: '<path d="M4 20V9l8-5 8 5v11M7 20v-7h10v7M9 16h6"/>',
    upgrade: '<path d="M12 3v13m0-13-5 5m5-5 5 5M5 20h14"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    pause: '<path d="M8 5h3v14H8zm5 0h3v14h-3z"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5c0-1 1-1.8 2.5-1.8s2.5.7 2.5 1.8-1 1.5-2.5 1.8-2.5.8-2.5 2 1 2 2.5 2 2.5-.8 2.5-2M12 6v12"/>',
    fuel: '<path d="M5 21V4h10v17M4 21h12M7 7h6v5H7zM15 8h2l2 3v6a1.5 1.5 0 0 0 3 0v-6l-2-2"/>',
    retry: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 9A7 7 0 0 1 18 7l2 5M18 15a7 7 0 0 1-12 2l-2-5"/>',
    home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
};

const coinPill = (coins: number): string => `<div class="currency-pill" aria-label="${coins.toLocaleString()} coins">${icon('coin')}<strong>${coins.toLocaleString()}</strong></div>`;

export class UIManager {
  private readonly overlay: HTMLDivElement;
  private readonly toastLayer: HTMLDivElement;
  private readonly orientation: HTMLDivElement;
  private readonly activePointers = { gas: new Set<number>(), brake: new Set<number>() };
  private hudDistance: HTMLElement | null = null;
  private hudCoins: HTMLElement | null = null;
  private fuelFill: HTMLElement | null = null;
  private bonusMessage: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement, private readonly actions: UIActions) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'ui-layer';
    this.toastLayer = document.createElement('div');
    this.toastLayer.className = 'toast-layer';
    this.toastLayer.setAttribute('aria-live', 'polite');
    this.orientation = document.createElement('div');
    this.orientation.className = 'orientation-prompt';
    this.orientation.innerHTML = `<div class="phone-rotate" aria-hidden="true"></div><strong>Rotate your device</strong><span>Landscape gives you the best view of the trail.</span>`;
    root.append(this.overlay, this.toastLayer, this.orientation);
    this.root.addEventListener('pointerdown', () => this.actions.unlockAudio(), { passive: true });
  }

  showMenu(save: SaveData): void {
    const vehicle = getVehicle(save.selectedVehicle);
    this.overlay.className = 'ui-layer menu-layer';
    this.overlay.innerHTML = `
      <section class="main-menu screen-panel" aria-labelledby="game-title">
        <header class="menu-topbar">
          <div class="brand-lockup"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><div><span>TRAIL</span><strong>FORGE</strong></div></div>
          <div class="menu-meta">${coinPill(save.coins)}<div class="best-pill"><span>BEST</span><strong>${Math.floor(save.bestDistance).toLocaleString()} m</strong></div></div>
        </header>
        <div class="hero-copy">
          <p class="eyebrow">ENDLESS PHYSICS ADVENTURE</p>
          <h1 id="game-title">Build momentum.<br><em>Own the ridge.</em></h1>
          <p>Master real suspension, chase impossible air, and forge your perfect ride.</p>
          <button class="primary-cta" data-action="play">${icon('play')}<span>START RUN</span><small>${vehicle.name} · ${save.selectedStage === 'countryside' ? 'Sunmeadow' : STAGES.find((stage) => stage.id === save.selectedStage)?.name}</small></button>
        </div>
        <nav class="menu-nav" aria-label="Game menu">
          <button data-screen="garage">${icon('garage')}<span>Garage</span></button>
          <button data-screen="upgrades">${icon('upgrade')}<span>Upgrades</span></button>
          <button data-screen="stages">${icon('map')}<span>Stages</span></button>
          <button data-screen="settings">${icon('settings')}<span>Settings</span></button>
        </nav>
        <div class="controls-hint"><span><kbd>A</kbd> BRAKE</span><span><kbd>D</kbd> GAS</span><span><kbd>ESC</kbd> PAUSE</span></div>
      </section>`;
    this.bindCommon();
  }

  showGarage(save: SaveData): void {
    this.showCollectionHeader('GARAGE', 'Choose a machine with a personality.', save, 'garage');
    const content = this.overlay.querySelector('.collection-content')!;
    content.innerHTML = `<div class="vehicle-grid">${VEHICLES.map((vehicle) => {
      const unlocked = save.unlockedVehicles.includes(vehicle.id);
      const selected = save.selectedVehicle === vehicle.id;
      return `<article class="vehicle-card ${selected ? 'is-selected' : ''} ${unlocked ? '' : 'is-locked'}">
        <div class="vehicle-silhouette kind-${vehicle.kind}" style="--vehicle:${vehicle.color};--accent:${vehicle.accent}"><i></i><i></i><b></b></div>
        <div class="vehicle-card-head"><div><h3>${vehicle.name}</h3><p>${vehicle.tagline}</p></div>${selected ? `<span class="selected-badge">${icon('check')} SELECTED</span>` : ''}</div>
        <div class="stat-grid">${(['engine', 'grip', 'suspension', 'fuel'] as UpgradeKey[]).map((key) => `<div><span>${key}</span><i><b style="width:${vehicle.stats[key] * 10}%"></b></i></div>`).join('')}</div>
        ${unlocked ? `<button class="card-action ${selected ? 'muted-action' : ''}" data-select-vehicle="${vehicle.id}" ${selected ? 'disabled' : ''}>${selected ? 'READY TO RIDE' : 'SELECT VEHICLE'}</button>` : `<button class="card-action unlock-action" data-unlock-vehicle="${vehicle.id}">${icon('lock')} UNLOCK · ${vehicle.unlockCost.toLocaleString()}</button>`}
      </article>`;
    }).join('')}</div>`;
    this.bindCommon();
  }

  showUpgrades(save: SaveData): void {
    const vehicle = getVehicle(save.selectedVehicle);
    const levels = save.upgrades[vehicle.id];
    this.showCollectionHeader('WORKSHOP', `Tune the ${vehicle.name}. Upgrades permanently change its physics.`, save, 'upgrades');
    const descriptions: Record<UpgradeKey, [string, string]> = {
      engine: ['Engine', 'More wheel torque, acceleration, and climbing power.'],
      grip: ['Tires', 'Higher terrain friction and steadier wheel response.'],
      suspension: ['Suspension', 'More stable compression, rebound, and landing control.'],
      fuel: ['Fuel tank', 'More capacity for longer runs between cans.'],
    };
    const content = this.overlay.querySelector('.collection-content')!;
    content.innerHTML = `<div class="workshop-layout">
      <aside class="workshop-vehicle"><div class="vehicle-silhouette large kind-${vehicle.kind}" style="--vehicle:${vehicle.color};--accent:${vehicle.accent}"><i></i><i></i><b></b></div><p>SELECTED VEHICLE</p><h2>${vehicle.name}</h2><button class="text-button" data-screen="garage">Change vehicle</button></aside>
      <div class="upgrade-list">${(Object.keys(descriptions) as UpgradeKey[]).map((key) => {
        const level = levels[key]; const maximum = level >= 20; const cost = upgradeCost(key, level);
        return `<article class="upgrade-row"><div class="upgrade-icon">${icon(key === 'engine' ? 'upgrade' : key === 'fuel' ? 'fuel' : 'settings')}</div><div class="upgrade-info"><div><h3>${descriptions[key][0]}</h3><span>LEVEL ${level} / 20</span></div><p>${descriptions[key][1]}</p><div class="level-track">${Array.from({ length: 20 }, (_, index) => `<i class="${index < level ? 'filled' : ''}"></i>`).join('')}</div></div><button class="upgrade-buy" data-upgrade="${key}" ${maximum ? 'disabled' : ''}><span>${maximum ? 'MAXED' : 'UPGRADE'}</span>${maximum ? icon('check') : `${icon('coin')} ${cost.toLocaleString()}`}</button></article>`;
      }).join('')}</div></div>`;
    this.bindCommon();
  }

  showStages(save: SaveData): void {
    this.showCollectionHeader('EXPEDITIONS', 'Every world changes gravity, grip, terrain, and fuel strategy.', save, 'stages');
    const content = this.overlay.querySelector('.collection-content')!;
    content.innerHTML = `<div class="stage-grid">${STAGES.map((stage) => {
      const unlocked = save.unlockedStages.includes(stage.id); const selected = save.selectedStage === stage.id;
      return `<article class="stage-card stage-${stage.id} ${selected ? 'is-selected' : ''}" style="--sky:${stage.palette.skyTop};--land:${stage.palette.surface};--dirt:${stage.palette.ground}">
        <div class="stage-art"><i></i><b></b><span></span></div><div class="stage-copy"><p>${stage.id === 'moon' ? 'LOW GRAVITY' : stage.id === 'snow' ? 'LOW GRIP' : stage.id === 'mars' ? 'TECHNICAL' : 'EXPEDITION'}</p><h3>${stage.name}</h3><span>${stage.subtitle}</span><div class="physics-tags"><i>GRAVITY ${Math.round(stage.gravity * 100)}%</i><i>GRIP ${Math.round(stage.grip * 100)}%</i></div>
        ${unlocked ? `<button class="card-action ${selected ? 'muted-action' : ''}" data-select-stage="${stage.id}" ${selected ? 'disabled' : ''}>${selected ? `${icon('check')} ACTIVE` : 'SELECT STAGE'}</button>` : `<button class="card-action unlock-action" data-unlock-stage="${stage.id}">${icon('lock')} UNLOCK · ${stage.unlockCost.toLocaleString()}</button>`}</div></article>`;
    }).join('')}</div>`;
    this.bindCommon();
  }

  showSettings(save: SaveData): void {
    this.showCollectionHeader('SETTINGS', 'Tune the mix and make the ride comfortable.', save, 'settings');
    const settings = save.settings;
    const content = this.overlay.querySelector('.collection-content')!;
    content.innerHTML = `<div class="settings-card">
      <label><div><strong>Music volume</strong><span>Procedural trail soundtrack</span></div><input type="range" min="0" max="1" step="0.01" value="${settings.musicVolume}" data-setting="musicVolume"><output>${Math.round(settings.musicVolume * 100)}%</output></label>
      <label><div><strong>Sound effects</strong><span>Engine, pickups, impacts, rewards</span></div><input type="range" min="0" max="1" step="0.01" value="${settings.sfxVolume}" data-setting="sfxVolume"><output>${Math.round(settings.sfxVolume * 100)}%</output></label>
      <label class="toggle-row"><div><strong>Mute all audio</strong><span>Silence music and effects</span></div><input type="checkbox" ${settings.muted ? 'checked' : ''} data-setting="muted"><i></i></label>
      <label class="toggle-row"><div><strong>Reduce interface motion</strong><span>Minimize transitions and camera easing</span></div><input type="checkbox" ${settings.reducedMotion ? 'checked' : ''} data-setting="reducedMotion"><i></i></label>
      <div class="achievement-summary"><div><strong>ACHIEVEMENTS</strong><span>${Object.values(save.achievements).filter((item) => item.unlocked).length} / ${ACHIEVEMENTS.length} complete</span></div>${ACHIEVEMENTS.map((achievement) => { const state = save.achievements[achievement.id]; const percent = Math.min(100, (state.progress / achievement.target) * 100); return `<div class="achievement-line ${state.unlocked ? 'complete' : ''}"><span>${state.unlocked ? icon('check') : icon('lock')}</span><div><strong>${achievement.name}</strong><small>${achievement.description}</small><i><b style="width:${percent}%"></b></i></div><em>+${achievement.reward}</em></div>`; }).join('')}</div>
      <button class="danger-button" data-action="reset-progress">RESET ALL PROGRESS</button>
    </div>`;
    this.bindCommon();
    this.bindSettings();
  }

  private showCollectionHeader(title: string, subtitle: string, save: SaveData, section: string): void {
    this.overlay.className = `ui-layer collection-layer ${section}-screen`;
    this.overlay.innerHTML = `<section class="collection-panel"><header class="collection-header"><button class="icon-button" data-action="menu" aria-label="Back to main menu">${icon('back')}</button><div><p>TRAILFORGE</p><h1>${title}</h1><span>${subtitle}</span></div>${coinPill(save.coins)}</header><div class="collection-content"></div></section>`;
  }

  showGameplay(): void {
    this.overlay.className = 'ui-layer gameplay-layer';
    this.overlay.innerHTML = `<section class="hud" aria-label="Run status">
      <div class="hud-chip coin-chip">${icon('coin')}<span><small>RUN COINS</small><strong id="hud-coins">0</strong></span></div>
      <div class="distance-chip"><strong id="hud-distance">0</strong><span>METERS</span></div>
      <div class="fuel-chip">${icon('fuel')}<div><span>FUEL</span><i><b id="fuel-fill"></b></i></div><button class="pause-button" data-action="pause" aria-label="Pause game">${icon('pause')}</button></div>
      <div id="bonus-message" class="bonus-message" aria-live="polite"></div>
      <div class="drive-controls"><button class="pedal brake-pedal" id="brake-control"><span>BRAKE</span><small>A / ←</small></button><button class="pedal gas-pedal" id="gas-control"><span>GAS</span><small>D / →</small></button></div>
    </section>`;
    this.hudDistance = this.overlay.querySelector('#hud-distance');
    this.hudCoins = this.overlay.querySelector('#hud-coins');
    this.fuelFill = this.overlay.querySelector('#fuel-fill');
    this.bonusMessage = this.overlay.querySelector('#bonus-message');
    this.overlay.querySelector('[data-action="pause"]')?.addEventListener('click', () => this.actions.pause());
    this.bindPedal('gas', this.overlay.querySelector('#gas-control') as HTMLButtonElement);
    this.bindPedal('brake', this.overlay.querySelector('#brake-control') as HTMLButtonElement);
  }

  updateHud(distance: number, coins: number, fuelRatio: number): void {
    if (this.hudDistance) this.hudDistance.textContent = Math.floor(distance).toLocaleString();
    if (this.hudCoins) this.hudCoins.textContent = coins.toLocaleString();
    if (this.fuelFill) {
      this.fuelFill.style.transform = `scaleX(${Math.max(0, Math.min(1, fuelRatio))})`;
      this.fuelFill.classList.toggle('is-low', fuelRatio < 0.2);
    }
  }

  showPause(settings: Settings): void {
    this.overlay.insertAdjacentHTML('beforeend', `<div class="modal-backdrop"><section class="pause-modal"><p>RUN PAUSED</p><h2>Catch your breath.</h2><button class="primary-cta compact" data-action="resume">${icon('play')} RESUME</button><button class="modal-action" data-action="restart">${icon('retry')} RESTART RUN</button><button class="modal-action" data-action="pause-settings">${icon('settings')} SETTINGS</button><div class="pause-settings-panel" hidden><label><span>MUSIC</span><input type="range" min="0" max="1" step="0.01" value="${settings.musicVolume}" data-setting="musicVolume"><output>${Math.round(settings.musicVolume * 100)}%</output></label><label><span>SFX</span><input type="range" min="0" max="1" step="0.01" value="${settings.sfxVolume}" data-setting="sfxVolume"><output>${Math.round(settings.sfxVolume * 100)}%</output></label><label class="pause-mute"><span>MUTE ALL</span><input type="checkbox" ${settings.muted ? 'checked' : ''} data-setting="muted"></label></div><button class="modal-action" data-action="menu">${icon('home')} MAIN MENU</button></section></div>`);
    this.overlay.querySelector('[data-action="resume"]')?.addEventListener('click', () => this.actions.resume());
    this.overlay.querySelector('[data-action="restart"]')?.addEventListener('click', () => this.actions.restart());
    this.overlay.querySelector('[data-action="pause-settings"]')?.addEventListener('click', () => {
      const panel = this.overlay.querySelector<HTMLElement>('.pause-settings-panel');
      if (panel) panel.hidden = !panel.hidden;
    });
    this.overlay.querySelector('[data-action="menu"]')?.addEventListener('click', () => this.actions.mainMenu());
    this.bindSettings();
  }

  hidePause(): void {
    this.overlay.querySelector('.modal-backdrop')?.remove();
  }

  showGameOver(summary: RunSummary): void {
    this.overlay.className = 'ui-layer result-layer';
    this.overlay.innerHTML = `<section class="result-card"><p class="eyebrow">RUN COMPLETE</p><h1>Trail ended.<br><em>Legend grew.</em></h1><div class="result-reason">${summary.reason}</div><div class="result-hero"><strong>${Math.floor(summary.distance).toLocaleString()}</strong><span>METERS</span><i>BEST ${Math.floor(summary.bestDistance).toLocaleString()} m</i></div><div class="result-grid"><div><span>Pickup coins</span><strong>+${summary.pickupCoins}</strong></div><div><span>Air time bonus</span><strong>+${summary.airtimeBonus}</strong></div><div><span>Flip bonus</span><strong>+${summary.flipBonus}</strong></div><div class="total"><span>Total earned</span><strong>${icon('coin')} ${summary.totalEarned}</strong></div></div><div class="result-actions"><button class="primary-cta compact" data-action="retry">${icon('retry')} RETRY</button><button class="modal-action" data-action="garage">${icon('garage')} GARAGE</button><button class="modal-action" data-action="menu">${icon('home')} MAIN MENU</button></div></section>`;
    this.overlay.querySelector('[data-action="retry"]')?.addEventListener('click', () => this.actions.retry());
    this.overlay.querySelector('[data-action="garage"]')?.addEventListener('click', () => this.actions.garage());
    this.overlay.querySelector('[data-action="menu"]')?.addEventListener('click', () => this.actions.mainMenu());
  }

  flashBonus(title: string, detail: string): void {
    if (!this.bonusMessage) return;
    this.bonusMessage.innerHTML = `<strong>${title}</strong><span>${detail}</span>`;
    this.bonusMessage.classList.remove('show');
    requestAnimationFrame(() => this.bonusMessage?.classList.add('show'));
    window.setTimeout(() => this.bonusMessage?.classList.remove('show'), 1300);
  }

  achievementToast(achievement: AchievementDefinition): void {
    const toast = document.createElement('article');
    toast.className = 'achievement-toast';
    toast.innerHTML = `<span>${icon('check')}</span><div><small>ACHIEVEMENT UNLOCKED</small><strong>${achievement.name}</strong><p>${achievement.description} · +${achievement.reward} coins</p></div>`;
    this.toastLayer.append(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    window.setTimeout(() => { toast.classList.remove('show'); window.setTimeout(() => toast.remove(), 300); }, 3700);
  }

  notify(message: string, tone: 'normal' | 'error' = 'normal'): void {
    const toast = document.createElement('div'); toast.className = `mini-toast ${tone}`; toast.textContent = message; this.toastLayer.append(toast);
    requestAnimationFrame(() => toast.classList.add('show')); window.setTimeout(() => { toast.classList.remove('show'); window.setTimeout(() => toast.remove(), 250); }, 1800);
  }

  private bindCommon(): void {
    this.overlay.querySelector('[data-action="play"]')?.addEventListener('click', () => this.actions.play());
    this.overlay.querySelector('[data-action="menu"]')?.addEventListener('click', () => this.actions.mainMenu());
    this.overlay.querySelector('[data-action="reset-progress"]')?.addEventListener('click', () => this.actions.resetProgress());
    this.overlay.querySelectorAll<HTMLElement>('[data-screen]').forEach((element) => element.addEventListener('click', () => this.actions.open(element.dataset.screen as 'garage' | 'upgrades' | 'stages' | 'settings')));
    this.overlay.querySelectorAll<HTMLElement>('[data-select-vehicle]').forEach((element) => element.addEventListener('click', () => this.actions.selectVehicle(element.dataset.selectVehicle!)));
    this.overlay.querySelectorAll<HTMLElement>('[data-unlock-vehicle]').forEach((element) => element.addEventListener('click', () => this.actions.unlockVehicle(element.dataset.unlockVehicle!)));
    this.overlay.querySelectorAll<HTMLElement>('[data-select-stage]').forEach((element) => element.addEventListener('click', () => this.actions.selectStage(element.dataset.selectStage as StageKind)));
    this.overlay.querySelectorAll<HTMLElement>('[data-unlock-stage]').forEach((element) => element.addEventListener('click', () => this.actions.unlockStage(element.dataset.unlockStage as StageKind)));
    this.overlay.querySelectorAll<HTMLElement>('[data-upgrade]').forEach((element) => element.addEventListener('click', () => this.actions.buyUpgrade(element.dataset.upgrade as UpgradeKey)));
  }

  private bindSettings(): void {
    this.overlay.querySelectorAll<HTMLInputElement>('[data-setting]').forEach((input) => input.addEventListener('input', () => {
      const key = input.dataset.setting as keyof Settings;
      const value = input.type === 'checkbox' ? input.checked : Number(input.value);
      if (input.type === 'range') input.nextElementSibling!.textContent = `${Math.round(Number(input.value) * 100)}%`;
      this.actions.updateSettings({ [key]: value });
    }));
  }

  private bindPedal(control: 'gas' | 'brake', button: HTMLButtonElement): void {
    const update = (): void => {
      button.classList.toggle('pressed', this.activePointers[control].size > 0);
      this.actions.controls({ gas: this.activePointers.gas.size > 0, brake: this.activePointers.brake.size > 0 });
    };
    button.addEventListener('pointerdown', (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); this.activePointers[control].add(event.pointerId); update(); });
    const release = (event: PointerEvent): void => { this.activePointers[control].delete(event.pointerId); update(); };
    button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
  }
}
