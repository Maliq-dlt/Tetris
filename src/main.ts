/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Main Entry Point & Fixed Timestep Game Engine
 */

import { AudioManager } from './audio/audioManager';
import { DEFAULT_ARR_MS, DEFAULT_DAS_MS, DEFAULT_SOFT_DROP_FACTOR } from './core/constants';
import { ActivePiece, GameMode, GameSettings, SoloRules, TetrominoType } from './core/types';
import { BagRandomizer } from './core/bag';
import { Board } from './core/board';
import { calculateClearScore } from './core/scoring';
import { calculateGhostY, createPiece, isPieceColliding, tryRotatePiece } from './core/piece';
import { detectTSpin } from './core/tspin';
import { InputHandler } from './input/inputHandler';
import { Renderer } from './render/renderer';
import { RunManager } from './roguelite/runManager';
import { UiManager } from './ui/uiManager';

type GameState = 'READY' | 'INTRO' | 'PLAYING' | 'SHOP' | 'PAUSED' | 'GAMEOVER';

class VitrailGame {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private audio: AudioManager;
  private input: InputHandler;
  private ui: UiManager;
  private runManager: RunManager;
  private board: Board;
  private bag: BagRandomizer;

  private state: GameState = 'READY';
  private activePiece: ActivePiece | null = null;
  private holdSlots: (TetrominoType | null)[] = [null, null];
  private canHoldThisPiece = true;

  // Timers & Gravity
  private gravityAccumulator = 0;
  private isTouchingGround = false;

  // Settings
  private settings: GameSettings;

  // FPS tracking
  private fpsCounter = 60;
  private fpsFrameCount = 0;
  private fpsLastTime = performance.now();

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.board = new Board();
    this.bag = new BagRandomizer();
    this.runManager = new RunManager();
    this.audio = new AudioManager();

    this.settings = this.loadSettings();
    this.input = new InputHandler(this.settings);
    this.ui = new UiManager(this.renderer.spriteCache);

    this.audio.initFromSettings(this.settings);
    this.renderer.screenShake = this.settings.screenShake;
    this.renderer.showParticles = this.settings.particles;
    this.setupUiEvents();
    this.ui.updateHud(this.runManager.stage, this.runManager.stats, 1);
    this.ui.updatePrism(0, 0);
    this.startLoop();
  }

  private loadSettings(): GameSettings {
    const defaultSettings: GameSettings = {
      dcd: 0, cancelDas: true, initialActions: true, sfxPack: 'arcade',
      das: DEFAULT_DAS_MS,
      arr: DEFAULT_ARR_MS,
      softDropMultiplier: DEFAULT_SOFT_DROP_FACTOR,
      sfxVolume: 0.7,
      ttsMode: 'procedural',
      screenShake: true,
      ghostPiece: true,
      particles: true
    };

    try {
      const stored = localStorage.getItem('vitrail_settings');
      const parsed = stored ? JSON.parse(stored) : {};
      const saved = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      // ponytail: migrate once; save before the marker so reloads retain explicit choices.
      if (localStorage.getItem('vitrail_audio_preset') !== 'puzzle-v2') {
        saved.ttsMode = 'procedural';
        localStorage.setItem('vitrail_settings', JSON.stringify(saved));
        localStorage.setItem('vitrail_audio_preset', 'puzzle-v2');
      }
      for (const [key, min, max] of [['das', 1000 / 60, 1000 / 3], ['arr', 0, 250 / 3], ['dcd', 0, 1000 / 3], ['softDropMultiplier', 5, 41], ['sfxVolume', 0, 1]] as const) {
        if (typeof saved?.[key] === 'number' && Number.isFinite(saved[key])) defaultSettings[key] = Math.min(max, Math.max(min, saved[key]));
      }
      for (const key of ['screenShake', 'ghostPiece', 'particles', 'cancelDas', 'initialActions'] as const) {
        if (typeof saved?.[key] === 'boolean') defaultSettings[key] = saved[key];
      }
      if (['procedural', 'kitten_tts', 'speech_synth'].includes(saved?.ttsMode)) defaultSettings.ttsMode = saved.ttsMode;
      if (['arcade', 'blockblast'].includes(saved?.sfxPack)) defaultSettings.sfxPack = saved.sfxPack;
      else {
        if (stored) defaultSettings.sfxPack = 'blockblast';
        localStorage.setItem('vitrail_settings', JSON.stringify({ ...saved, sfxPack: defaultSettings.sfxPack }));
      }
      return defaultSettings;
    } catch {
      // Use defaults
    }
    return defaultSettings;
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('vitrail_settings', JSON.stringify(this.settings));
    } catch {
      // Storage unavailable
    }
    this.input.settings = this.settings;
    this.audio.initFromSettings(this.settings);
    this.renderer.screenShake = this.settings.screenShake;
    this.renderer.showParticles = this.settings.particles;
  }

  private setupUiEvents(): void {
    document.getElementById('btn-start')?.addEventListener('click', () => this.startNewRun('sprint'));
    for (const mode of ['blitz', 'zen'] as const) document.getElementById(`btn-${mode}`)?.addEventListener('click', () => this.startNewRun(mode));
    const customDialog = document.getElementById('custom-dialog') as HTMLDialogElement;
    document.getElementById('btn-custom')!.addEventListener('click', () => customDialog.showModal());
    document.getElementById('btn-custom-close')!.addEventListener('click', () => customDialog.close());
    document.getElementById('custom-form')!.addEventListener('submit', event => {
      event.preventDefault();
      const value = (id: string) => Number((document.getElementById(id) as HTMLInputElement).value);
      customDialog.close();
      this.startNewRun('custom', { targetLines: value('custom-lines'), timeLimitMs: value('custom-seconds') * 1000, level: value('custom-level') });
    });
    document.getElementById('btn-roguelite')?.addEventListener('click', () => this.startNewRun('roguelite'));
    document.getElementById('btn-lobby-settings')?.addEventListener('click', () => this.openSettingsDialog());
    document.querySelectorAll('[data-home]').forEach(button => button.addEventListener('click', () => this.showLobby()));
    document.getElementById('btn-voice-preview')?.addEventListener('click', () => {
      this.audio.onFirstInteraction();
      this.audio.playClear(2, false, false, false, 3, false);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'PLAYING') this.togglePause();
    });
    window.addEventListener('blur', () => {
      if (this.state === 'PLAYING') this.togglePause();
    });
    // Window Resize
    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.ui.renderHoldCanvases(this.holdSlots, this.runManager.getEffectiveHoldSlots());
      this.ui.renderNextQueue(this.bag.peek(this.runManager.getEffectivePreviews()));
    });

    // Audio on first interaction
    const initAudioOnce = () => {
      this.audio.onFirstInteraction();
      window.removeEventListener('click', initAudioOnce);
      window.removeEventListener('keydown', initAudioOnce);
    };
    window.addEventListener('click', initAudioOnce);
    window.addEventListener('keydown', initAudioOnce);

    // Header buttons
    document.getElementById('btn-audio-toggle')?.addEventListener('click', () => this.toggleAudio());

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.openSettingsDialog();
    });

    document.getElementById('btn-pause')?.addEventListener('click', () => {
      this.togglePause();
    });

    // Pause dialog buttons
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
      this.ui.showPauseModal(false);
      this.openSettingsDialog();
    });

    document.getElementById('btn-pause-restart')?.addEventListener('click', () => {
      this.ui.showPauseModal(false);
      this.startNewRun();
    });

    // Game over restart button
    document.getElementById('btn-restart-run')?.addEventListener('click', () => {
      this.ui.hideGameOverModal();
      this.startNewRun();
    });

    // Settings inputs
    this.bindSettingsControls();
  }

  private bindSettingsControls(): void {
    const sfxInput = document.getElementById('cfg-sfx-vol') as HTMLInputElement;
    const ttsSelect = document.getElementById('cfg-tts-mode') as HTMLSelectElement;
    const dasInput = document.getElementById('cfg-das') as HTMLInputElement;
    const arrInput = document.getElementById('cfg-arr') as HTMLInputElement;
    const softDropInput = document.getElementById('cfg-softdrop') as HTMLInputElement;
    const shakeInput = document.getElementById('cfg-screenshake') as HTMLInputElement;
    const ghostInput = document.getElementById('cfg-ghostpiece') as HTMLInputElement;
    const particlesInput = document.getElementById('cfg-particles') as HTMLInputElement;

    const dcdInput = document.getElementById('cfg-dcd') as HTMLInputElement;
    const cancelInput = document.getElementById('cfg-cancel-das') as HTMLInputElement;
    const initialInput = document.getElementById('cfg-initial') as HTMLInputElement;
    const packInput = document.getElementById('cfg-sfx-pack') as HTMLSelectElement;
    dcdInput.value = String(this.settings.dcd ?? 0);
    cancelInput.checked = this.settings.cancelDas !== false;
    initialInput.checked = this.settings.initialActions !== false;
    packInput.value = this.settings.sfxPack ?? 'arcade';

    // Set initial values
    if (sfxInput) sfxInput.value = this.settings.sfxVolume.toString();
    if (ttsSelect) ttsSelect.value = this.settings.ttsMode;
    if (dasInput) dasInput.value = this.settings.das.toString();
    if (arrInput) arrInput.value = this.settings.arr.toString();
    if (softDropInput) softDropInput.value = this.settings.softDropMultiplier.toString();
    if (shakeInput) shakeInput.checked = this.settings.screenShake;
    if (ghostInput) ghostInput.checked = this.settings.ghostPiece;
    if (particlesInput) particlesInput.checked = this.settings.particles;

    const updateDisplayLabels = () => {
      const valSfx = document.getElementById('val-sfx-vol');
      const valDas = document.getElementById('val-das');
      const valArr = document.getElementById('val-arr');
      document.getElementById('val-dcd')!.textContent = `${Math.round((this.settings.dcd ?? 0) * 10) / 10} ms`;
      const valSoft = document.getElementById('val-softdrop');

      if (valSfx) valSfx.innerText = `${Math.round(this.settings.sfxVolume * 100)}%`;
      if (valDas) valDas.innerText = `${Math.round(this.settings.das * 10) / 10} ms`;
      if (valArr) valArr.innerText = `${Math.round(this.settings.arr * 10) / 10} ms`;
      if (valSoft) valSoft.innerText = this.settings.softDropMultiplier === 41 ? '∞' : `${this.settings.softDropMultiplier}×`;
    };
    updateDisplayLabels();
    document.getElementById('btn-fast-controls')?.addEventListener('click', () => {
      this.settings.dcd = 0;
      dcdInput.value = '0';
      this.settings.das = DEFAULT_DAS_MS;
      this.settings.arr = DEFAULT_ARR_MS;
      this.settings.softDropMultiplier = DEFAULT_SOFT_DROP_FACTOR;
      dasInput.value = String(this.settings.das);
      arrInput.value = String(this.settings.arr);
      softDropInput.value = String(this.settings.softDropMultiplier);
      this.saveSettings();
      updateDisplayLabels();
    });

    const saveFromInputs = () => {
      this.settings.sfxVolume = parseFloat(sfxInput.value);
      this.settings.ttsMode = ttsSelect.value as GameSettings['ttsMode'];
      this.settings.dcd = Number(dcdInput.value);
      this.settings.cancelDas = cancelInput.checked;
      this.settings.initialActions = initialInput.checked;
      this.settings.sfxPack = packInput.value as GameSettings['sfxPack'];
      this.settings.das = Number(dasInput.value);
      this.settings.arr = Number(arrInput.value);
      this.settings.softDropMultiplier = parseInt(softDropInput.value, 10);
      this.settings.screenShake = shakeInput.checked;
      this.settings.ghostPiece = ghostInput.checked;
      this.settings.particles = particlesInput.checked;

      this.saveSettings();
      updateDisplayLabels();
    };

    [sfxInput, ttsSelect, dasInput, arrInput, dcdInput, cancelInput, initialInput, packInput, softDropInput, shakeInput, ghostInput, particlesInput].forEach(el => {
      el?.addEventListener('input', saveFromInputs);
      el?.addEventListener('change', saveFromInputs);
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.ui.showSettingsModal(false);
      this.input.reset();
      if (this.state === 'PAUSED') this.ui.showPauseModal(true);
      else if (this.state === 'READY') document.getElementById('btn-start')!.focus();
    });

    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      this.ui.showSettingsModal(false);
      this.input.reset();
      if (this.state === 'PAUSED') this.ui.showPauseModal(true);
      else if (this.state === 'READY') document.getElementById('btn-start')!.focus();
    });
  }

  private toggleAudio(): void {
    const muted = this.audio.toggleMute();
    document.querySelector('#btn-audio-toggle .btn-label')!.textContent = muted ? 'Senyap' : 'Suara';
    document.querySelector('#btn-audio-toggle .btn-icon')!.textContent = muted ? '×' : '♪';
    document.getElementById('btn-audio-toggle')!.setAttribute('aria-pressed', String(muted));
  }

  private openSettingsDialog(): void {
    if (!['READY', 'PLAYING', 'PAUSED'].includes(this.state)) return;
    if (this.state === 'PLAYING') this.togglePause();
    this.ui.showSettingsModal(true);
  }

  private showLobby(): void {
    this.state = 'READY';
    this.activePiece = null;
    this.input.reset();
    this.audio.tts.stop();
    this.ui.cancelIntro();
    this.ui.hideGameOverModal();
    this.ui.hideRelicSelection();
    this.ui.showPauseModal(false);
    this.ui.showSettingsModal(false);
    this.ui.clearAnnouncements();
    document.getElementById('app')!.classList.add('is-lobby');
    document.getElementById('welcome-screen')!.classList.remove('hidden');
    document.getElementById('btn-start')!.focus();
  }

  private startNewRun(mode: GameMode = this.runManager.mode, rules?: SoloRules): void {
    this.audio.onFirstInteraction();
    this.ui.cancelIntro();
    this.ui.clearAnnouncements();
    document.getElementById('app')!.classList.remove('is-lobby');
    document.body.dataset.mode = mode;
    document.getElementById('hud-mode')!.textContent = { sprint: '40 LINES', blitz: 'BLITZ', zen: 'ZEN', custom: 'CUSTOM', roguelite: 'ROGUELITE' }[mode];
    this.audio.tts.stop();
    this.input.reset();
    document.getElementById('welcome-screen')?.classList.add('hidden');
    this.ui.hideGameOverModal();
    this.ui.hideRelicSelection();
    this.ui.showPauseModal(false);
    this.ui.showSettingsModal(false);
    this.board.reset();
    this.bag.reset();
    this.runManager.resetRun(mode, rules);
    this.renderer.clearEffects();
    this.ui.timeLimitMs = this.runManager.rules.timeLimitMs;
    this.ui.updateTiming(0, 0, this.runManager.bestSprintMs);
    this.ui.updatePrism(0, 0);
    this.holdSlots = [null, null];
    this.canHoldThisPiece = true;
    this.activePiece = null;
    this.ui.updateHud(this.runManager.stage, this.runManager.stats, 1);
    this.ui.updateRelicInventory([]);
    this.ui.renderHoldCanvases(this.holdSlots, 1);
    this.ui.renderNextQueue(this.bag.peek(5));
    if (mode === 'roguelite') this.openShop();
    else this.startChamber();
  }

  private startChamber(): void {
    this.state = 'INTRO';
    this.activePiece = null;
    this.input.dasModifier = this.runManager.getEffectiveDasModifier();
    if (this.runManager.getEffectiveHoldSlots() === 1) this.holdSlots[1] = null;

    // Apply chamber modifier rules to bag/board
    this.bag.setExcludedPieces(this.runManager.getExcludedPieces());
    this.bag.setGuaranteedRule(this.runManager.getGuaranteedPieceRule());

    if (this.runManager.stage.modifier.effects.lockOuterColumns) {
      this.board.applyLeadSeal();
    }

    this.ui.updateHud(this.runManager.stage, this.runManager.stats, this.runManager.level);
    this.ui.updateRelicInventory(this.runManager.relics);
    this.ui.renderHoldCanvases(this.holdSlots, this.runManager.getEffectiveHoldSlots());

    this.ui.showChamberIntro(this.runManager.stage, () => {
      const initial = this.input.initialActions();
      this.input.clearActions();
      this.state = 'PLAYING';
      this.canvas.focus({ preventScroll: true });
      this.spawnNextPiece();
      if (this.settings.initialActions !== false && this.activePiece) {
        if (initial.hold) this.executeHold();
        if (initial.rotation && this.activePiece) {
          const result = tryRotatePiece(this.activePiece, initial.rotation, this.board.isCellBlocked);
          if (result.success) { this.activePiece = result.newPiece; this.audio.playRotate(); }
        }
      }
    }, count => this.audio.playCountdown(count));
  }

  private spawnNextPiece(): void {
    const pieceType = this.bag.next();
    this.activePiece = createPiece(pieceType);
    this.canHoldThisPiece = true;
    this.isTouchingGround = false;
    this.gravityAccumulator = 0;

    // Update Next Queue previews
    const previewCount = this.runManager.getEffectivePreviews();
    const nextPieces = this.bag.peek(previewCount);
    this.ui.renderNextQueue(nextPieces);

    // Immediate Block-Out check
    if (isPieceColliding(this.activePiece, 0, 0, this.activePiece.rotation, this.board.isCellBlocked)) {
      this.handleTopOut();
    }
  }

  private handleTopOut(): void {
    if (this.runManager.mode === 'zen') {
      this.board.reset();
      this.ui.showAnnouncement('ZEN · papan baru');
      this.spawnNextPiece();
      return;
    }
    // Check Second Chance Relic
    if (this.runManager.hasRelic('faceted_oculus') && !this.runManager.secondChanceUsed) {
      this.runManager.secondChanceUsed = true;
      this.board.clearTopStack(7);
      this.ui.showAnnouncement('Kesempatan kedua');
      this.audio.playRelicSelect();
      this.spawnNextPiece();
      return;
    }

    // Run Over
    this.state = 'GAMEOVER';
    this.audio.playGameOver();
    this.ui.updateHud(this.runManager.stage, this.runManager.stats, this.runManager.level);
    this.ui.showGameOverModal(this.runManager.stats, false, this.runManager.elapsedMs, this.runManager.pieces, this.runManager.bestSprintMs, this.runManager.mode);
  }

  private togglePause(): void {
    if (this.state === 'PLAYING') {
      this.input.reset();
      this.audio.tts.stop();
      this.state = 'PAUSED';
      this.ui.showPauseModal(true);
    } else if (this.state === 'PAUSED') {
      this.input.reset();
      this.state = 'PLAYING';
      this.ui.showPauseModal(false);
      this.canvas.focus({ preventScroll: true });
    }
  }

  // =========================================================================
  // FIXED TIMESTEP 60 HZ LOGIC UPDATE
  // =========================================================================

  private update(dtMs: number): void {
    const dtSeconds = dtMs / 1000;
    this.input.update(dtMs);

    if (!document.getElementById('modal-settings')!.classList.contains('hidden')) {
      if (this.input.consumeAction('pause')) document.getElementById('btn-close-settings')!.click();
      this.input.clearActions();
      return;
    }

    // Handle global hotkeys (Restart, FPS, Mute, Settings)
    if (this.input.consumeAction('restart') && this.state !== 'READY') {
      this.startNewRun();
      return;
    }
    if (this.input.consumeAction('toggleFps')) {
      this.ui.toggleFpsVisible();
    }
    if (this.input.consumeAction('toggleMute')) {
      this.toggleAudio();
    }
    if (this.input.consumeAction('openSettings')) {
      this.openSettingsDialog();
      return;
    }

    if (this.state === 'SHOP') {
      for (const [index, action] of ['pickRelic1', 'pickRelic2', 'pickRelic3'].entries()) {
        if (this.input.consumeAction(action as 'pickRelic1' | 'pickRelic2' | 'pickRelic3')) this.shopAction('buy', String(index));
      }
      this.input.clearActions();
      return;
    }

    if (this.state === 'PAUSED') {
      if (this.input.consumeAction('pause')) {
        this.togglePause();
      }
      return;
    }

    if (this.state !== 'PLAYING' || !this.activePiece) {
      this.input.clearActions();
      return;
    }

    if (this.input.consumeAction('pause')) {
      this.togglePause();
      return;
    }

    if (this.runManager.tick(dtMs)) {
      this.finishSolo();
      return;
    }
    this.ui.updateTiming(this.runManager.elapsedMs, this.runManager.pieces, this.runManager.bestSprintMs);

    // Input processing for active piece
    this.handleGameplayInputs();
    if (this.state !== 'PLAYING' || !this.activePiece) return;

    // Check Periodic Garbage Modifier
    const garbageInterval = this.runManager.getPeriodicGarbageInterval();
    if (garbageInterval) {
      this.runManager.periodicGarbageElapsed += dtSeconds;
      if (this.runManager.periodicGarbageElapsed >= garbageInterval) {
        this.runManager.periodicGarbageElapsed = 0;
        const topOut = this.board.addGarbageLines(1);
        this.renderer.camera.addTrauma(0.4);
        this.ui.showAnnouncement('Baris tambahan');
        if (topOut) {
          this.handleTopOut();
          return;
        }
      }
    }

    // Gravity calculation
    const baseInterval = this.runManager.getEffectiveGravityInterval(this.runManager.level);
    const isSoftDropping = this.input.isSoftDropActive();
    const effectiveInterval = isSoftDropping
      ? baseInterval / this.settings.softDropMultiplier
      : baseInterval;

    if (isSoftDropping && this.settings.softDropMultiplier === 41) {
      const targetY = calculateGhostY(this.activePiece, this.board.isCellBlocked);
      const distance = targetY - this.activePiece.y;
      if (distance > 0) {
        this.activePiece.y = targetY;
        this.activePiece.lastActionWasRotate = false;
        this.runManager.addScore(distance * (this.runManager.hasRelic('onyx_shroud') ? 5 : 1));
      }
    }
    this.gravityAccumulator += dtMs;
    while (this.gravityAccumulator >= effectiveInterval) {
      this.gravityAccumulator -= effectiveInterval;

      // Try moving down 1 cell
      if (!isPieceColliding(this.activePiece, 0, 1, this.activePiece.rotation, this.board.isCellBlocked)) {
        this.activePiece.y++;
        this.activePiece.lastActionWasRotate = false;
        this.isTouchingGround = false;

        if (isSoftDropping) {
          const softMultiplier = this.runManager.hasRelic('onyx_shroud') ? 5 : 1;
          this.runManager.addScore(1 * softMultiplier);
        }
      } else {
        // Ground contact reached
        this.isTouchingGround = true;
        break;
      }
    }

    // Recheck ground contact for lock delay
    if (isPieceColliding(this.activePiece, 0, 1, this.activePiece.rotation, this.board.isCellBlocked)) {
      this.isTouchingGround = true;
      this.activePiece.lockTimer += dtMs;

      const effectiveLockDelay = this.runManager.getEffectiveLockDelay();
      if (this.activePiece.lockTimer >= effectiveLockDelay) {
        this.lockActivePiece();
      }
    } else {
      this.isTouchingGround = false;
    }
  }

  private handleGameplayInputs(): void {
    if (!this.activePiece) return;

    const shift = this.input.consumeHorizontalShift();
    const direction = Math.sign(shift);
    for (let i = 0; i < Math.abs(shift); i++) {
      if (isPieceColliding(this.activePiece, direction, 0, this.activePiece.rotation, this.board.isCellBlocked)) break;
      this.activePiece.x += direction;
      this.activePiece.lastActionWasRotate = false;
      this.onPieceManipulated();
      if (i === 0) this.audio.playMove();
    }

    // Rotations (SRS Wall Kicks)
    if (this.input.consumeAction('rotateCW')) {
      const result = tryRotatePiece(this.activePiece, 'cw', this.board.isCellBlocked);
      if (result.success) {
        this.activePiece = result.newPiece;
        this.audio.playRotate();
        this.input.delayAutoShift();
        this.onPieceManipulated();
      }
    }

    if (this.input.consumeAction('rotateCCW')) {
      const result = tryRotatePiece(this.activePiece, 'ccw', this.board.isCellBlocked);
      if (result.success) {
        this.activePiece = result.newPiece;
        this.audio.playRotate();
        this.input.delayAutoShift();
        this.onPieceManipulated();
      }
    }

    if (this.input.consumeAction('rotate180')) {
      const result = tryRotatePiece(this.activePiece, '180', this.board.isCellBlocked);
      if (result.success) {
        this.activePiece = result.newPiece;
        this.audio.playRotate();
        this.input.delayAutoShift();
        this.onPieceManipulated();
      }
    }

    // Hard Drop
    if (this.input.consumeAction('hardDrop')) {
      this.executeHardDrop();
      return;
    }

    // Hold Piece
    if (this.input.consumeAction('hold')) {
      this.executeHold();
    }
  }

  private onPieceManipulated(): void {
    if (!this.activePiece) return;
    // Move reset if touching ground
    if (this.isTouchingGround) {
      const maxResets = this.runManager.getEffectiveMaxLockResets();
      if (this.activePiece.movesSinceTouchGround < maxResets) {
        this.activePiece.lockTimer = 0;
        this.activePiece.movesSinceTouchGround++;
      }
    }
  }

  private executeHardDrop(): void {
    if (!this.activePiece) return;

    if (this.runManager.hasRelic('heavy_lead_cane')) this.board.clearBottomRowIfAlmostFull();
    const ghostY = calculateGhostY(this.activePiece, this.board.isCellBlocked);
    const dropDistance = ghostY - this.activePiece.y;
    const startY = this.activePiece.y;
    this.activePiece.y = ghostY;
    this.runManager.addScore(dropDistance * 2);

    this.audio.playHardDrop();
    this.renderer.triggerHardDropEffect(this.activePiece, startY);
    this.input.delayAutoShift();

    this.lockActivePiece();
  }

  private executeHold(): void {
    if (!this.activePiece || !this.canHoldThisPiece) return;

    const maxHoldSlots = this.runManager.getEffectiveHoldSlots();
    const currentPieceType = this.activePiece.type;
    this.gravityAccumulator = 0;
    this.isTouchingGround = false;

    if (this.holdSlots[0] === null) {
      // First slot empty
      this.holdSlots[0] = currentPieceType;
      this.spawnNextPiece();
    } else if (maxHoldSlots > 1 && this.holdSlots[1] === null) {
      // Secondary slot empty
      this.holdSlots[1] = currentPieceType;
      this.spawnNextPiece();
    } else {
      // Swap out from primary slot
      const swappedType = this.holdSlots[0];
      if (maxHoldSlots > 1) {
        this.holdSlots[0] = this.holdSlots[1];
        this.holdSlots[1] = currentPieceType;
      } else this.holdSlots[0] = currentPieceType;
      this.activePiece = createPiece(swappedType);
      if (isPieceColliding(this.activePiece, 0, 0, this.activePiece.rotation, this.board.isCellBlocked)) {
        this.handleTopOut();
        return;
      }
    }

    this.canHoldThisPiece = false;
    this.audio.playHold();
    this.ui.renderHoldCanvases(this.holdSlots, maxHoldSlots);
  }

  private lockActivePiece(): void {
    if (!this.activePiece) return;

    const piece = this.activePiece;
    this.activePiece = null;

    // Detect T-Spin before board is modified
    const tspin = detectTSpin(piece, this.board.isCellBlocked);

    // Lock minos into board
    const { topOut } = this.board.lockPiece(piece);
    this.audio.playLock();
    this.renderer.triggerLockEffect(piece);
    this.runManager.pieces++;

    if (topOut) {
      this.handleTopOut();
      return;
    }

    // Check line clears
    const clearedRows = this.board.clearFullLines();
    const linesCleared = clearedRows.length;
    const isPerfectClear = linesCleared > 0 && this.board.isPerfectClear();

    // Scoring & B2B
    if (linesCleared > 0 || tspin !== 'none') {
      if (linesCleared > 0) {
        this.runManager.stats.currentCombo++;
        if (this.runManager.stats.currentCombo > this.runManager.stats.maxCombo) {
          this.runManager.stats.maxCombo = this.runManager.stats.currentCombo;
        }
      }

      if (linesCleared === 0) this.runManager.stats.currentCombo = 0;
      const isB2B = this.runManager.stats.b2bStreak > 0;
      const b2bMult = this.runManager.getEffectiveB2BMultiplier();
      const comboBonus = this.runManager.getEffectiveComboBonus();
      const prism = this.runManager.registerPrismClear(linesCleared, this.runManager.stats.currentCombo);
      const scoreMult = this.runManager.getEffectiveScoreMultiplier() * prism.multiplier;
      this.ui.updatePrism(this.runManager.prismCharge, this.runManager.feverLines);
      if (prism.activated) this.ui.showAnnouncement('FEVER · 2×');

      const scoreResult = calculateClearScore(
        linesCleared,
        tspin,
        this.runManager.level,
        isB2B,
        Math.max(0, this.runManager.stats.currentCombo - 1),
        isPerfectClear,
        b2bMult,
        comboBonus,
        scoreMult
      );

      if (tspin !== 'none' && this.runManager.hasRelic('martyrs_shard')) scoreResult.finalScore *= 2;
      if (linesCleared === 1 && tspin === 'none' && this.runManager.hasRelic('martyrs_shard')) scoreResult.finalScore = 0;
      if (isPerfectClear && this.runManager.hasRelic('crucible_of_light')) scoreResult.finalScore += 10000;
      this.runManager.addScore(scoreResult.finalScore);
      const earned = this.runManager.awardClearCoins(linesCleared, this.runManager.stats.currentCombo);
      if (earned) this.ui.showAnnouncement(`+$${earned}`);
      this.ui.updateWallet(this.runManager.coins);

      // Maintain or break B2B
      if (scoreResult.maintainsB2B && scoreResult.isDifficultClear && linesCleared > 0) {
        this.runManager.stats.b2bStreak++;
      } else if (linesCleared > 0) {
        // Curse penalty: Monk's Patience inflicts garbage on broken B2B
        if (this.runManager.hasRelic('monks_patience') && this.runManager.stats.b2bStreak > 0) {
          const topOut = this.board.addGarbageLines(1);
          this.ui.showAnnouncement('B2B putus · +1 baris');
          if (topOut) { this.handleTopOut(); return; }
        }
        this.runManager.stats.b2bStreak = 0;
      }

      // Track statistics
      if (tspin !== 'none') {
        this.runManager.stats.tspins++;

      }
      if (linesCleared === 4) {
        this.runManager.stats.tetrises++;
      }

      // Announce and display banner
      this.triggerClearAnnouncements(linesCleared, tspin, this.runManager.stats.b2bStreak, isPerfectClear);

      // Render line clear effects
      if (linesCleared > 0) {
        this.renderer.triggerLineClearEffect(clearedRows);

      }

      this.audio.playClear(linesCleared, tspin !== 'none', isB2B, isPerfectClear,
        this.runManager.stats.currentCombo, prism.activated);
      if (this.runManager.mode !== 'sprint') this.ui.showScoreBurst(scoreResult.finalScore, this.runManager.stats.currentCombo);
      // Stage progression check
      const chamberCleared = this.runManager.addLines(linesCleared);
      this.ui.updateHud(this.runManager.stage, this.runManager.stats, this.runManager.level);

      if (chamberCleared) {
        if (this.runManager.mode !== 'roguelite') {
          this.finishSolo();
          return;
        }
        this.handleChamberCleared();
        return;
      }
    } else {
      // No lines cleared: reset combo
      this.runManager.stats.currentCombo = 0;
      this.runManager.registerPrismClear(0, 0);
      this.ui.updatePrism(this.runManager.prismCharge, this.runManager.feverLines);
      this.ui.updateHud(this.runManager.stage, this.runManager.stats, this.runManager.level);
    }

    // Spawn next piece
    this.spawnNextPiece();
  }

  private triggerClearAnnouncements(
    lines: number,
    tspin: string,
    b2bStreak: number,
    isPerfectClear: boolean
  ): void {
    if (isPerfectClear) {
      this.ui.showAnnouncement('PERFECT CLEAR');

      return;
    }

    if (tspin === 'full') {
      const name = lines === 3 ? 'T-SPIN TRIPLE!' : lines === 2 ? 'T-SPIN DOUBLE!' : lines === 1 ? 'T-SPIN SINGLE!' : 'T-SPIN!';
      this.ui.showAnnouncement(name);
      return;
    } else if (tspin === 'mini') {
      this.ui.showAnnouncement('T-SPIN MINI');
      return;
    }

    if (lines === 4) {
      if (b2bStreak > 1) {
        this.ui.showAnnouncement(`B2B TETRIS! (x${b2bStreak})`);
      } else {
        this.ui.showAnnouncement('TETRIS!');
      }
    } else if (lines === 3) {
      this.ui.showAnnouncement('TRIPLE');
    } else if (this.runManager.stats.currentCombo > 2) {
      this.ui.showAnnouncement(`COMBO ${this.runManager.stats.currentCombo}!`);
    }
  }

  private finishSolo(): void {
    this.runManager.finishSprint();
    this.state = 'GAMEOVER';
    this.activePiece = null;
    this.input.reset();
    this.audio.playStageClear();
    this.ui.updateTiming(this.runManager.elapsedMs, this.runManager.pieces, this.runManager.bestSprintMs);
    this.ui.updateHud(this.runManager.stage, this.runManager.stats, this.runManager.level);
    this.ui.showGameOverModal(this.runManager.stats, true, this.runManager.elapsedMs, this.runManager.pieces, this.runManager.bestSprintMs, this.runManager.mode);
  }

  private handleChamberCleared(): void {
    this.audio.playStageClear();
    this.runManager.settleStage();
    this.runManager.advanceToNextStage();
    this.openShop();
  }

  private openShop(): void {
    if (!this.runManager.openShop()) return;
    this.state = 'SHOP';
    this.activePiece = null;
    this.input.reset();
    this.audio.tts.stop();
    this.renderShop();
  }

  private renderShop(): void {
    this.ui.updateWallet(this.runManager.coins);
    this.ui.updateRelicInventory(this.runManager.relics);
    this.ui.showShop(this.runManager, this.board.getStackHeight() > 0, (action, value) => this.shopAction(action, value));
  }

  private shopAction(action: string, value = ''): void {
    if (this.state !== 'SHOP') return;
    let changed = false;
    if (action === 'buy') changed = this.runManager.buyCard(Number(value));
    if (action === 'sell') changed = this.runManager.sellCard(value);
    if (action === 'reroll') changed = this.runManager.rerollShop();
    if (action === 'repair' && this.runManager.buyRepair(this.board.getStackHeight() > 0)) {
      this.board.clearBottomRows(4);
      changed = true;
    }
    if (action === 'continue' && this.runManager.closeShop()) {
      this.ui.hideRelicSelection();
      this.input.reset();
      this.startChamber();
      return;
    }
    if (changed) {
      this.audio.playRelicSelect();
      this.input.reset();
      this.renderShop();
    }
  }

  // =========================================================================
  // MASTER GAME LOOP (requestAnimationFrame + 60 Hz fixed timestep)
  // =========================================================================

  private startLoop(): void {
    const FIXED_STEP_MS = 1000 / 60; // 16.6666 ms
    let accumulator = 0;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      // Calculate delta capped at 100ms to avoid spiral of death
      const delta = Math.min(currentTime - lastTime, 100);
      lastTime = currentTime;
      accumulator += delta;

      // Consume fixed timesteps
      while (accumulator >= FIXED_STEP_MS) {
        this.update(FIXED_STEP_MS);
        accumulator -= FIXED_STEP_MS;
      }

      // Update render particle and camera effects
      this.renderer.updateEffects(delta / 1000);

      // Decoupled Render
      this.renderer.render(
        this.board,
        this.activePiece,
        this.settings.ghostPiece && this.runManager.getGhostPieceEnabled()
      );

      // Calculate and update FPS counter
      this.fpsFrameCount++;
      if (currentTime - this.fpsLastTime >= 1000) {
        this.fpsCounter = this.fpsFrameCount;
        this.fpsFrameCount = 0;
        this.fpsLastTime = currentTime;
        this.ui.updateFps(this.fpsCounter);
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

// Instantiate game on DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  new VitrailGame();
});
