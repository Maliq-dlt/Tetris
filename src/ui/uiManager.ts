/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Master UI & DOM Manager
 */
import { CardTrigger, GameMode, RelicDefinition, RunStats, StageInfo, TetrominoType } from '../core/types';
import { Renderer } from '../render/renderer';
import { SpriteCache } from '../render/spriteCache';
import type { RunManager } from '../roguelite/runManager';
export function formatTime(ms: number): string {
  const value = Math.max(0, Math.round(ms));
  return `${Math.floor(value / 60000)}:${String(Math.floor(value / 1000) % 60).padStart(2, '0')}.${String(value % 1000).padStart(3, '0')}`;
}
export class UiManager {
  public timeLimitMs = 0;
  private hudTime = document.getElementById('hud-time')!;
  private hudPieces = document.getElementById('hud-pieces')!;
  private hudPps = document.getElementById('hud-pps')!;
  private hudBestTime = document.getElementById('hud-best-time')!;
  private spriteCache: SpriteCache;
  private introInterval: ReturnType<typeof setInterval> | undefined;
  // DOM Elements
  private hudStageNum!: HTMLElement;
  private hudStageName!: HTMLElement;
  private hudGoalDesc!: HTMLElement;
  private hudGoalCounter!: HTMLElement;
  private hudGoalProgress!: HTMLElement;
  private hudModifierTitle!: HTMLElement;
  private hudModifierDesc!: HTMLElement;
  private hudRelicCount!: HTMLElement;
  private relicsList!: HTMLElement;
  private nextCanvasContainer!: HTMLElement;
  private holdCanvas0!: HTMLCanvasElement;
  private holdCanvas1!: HTMLCanvasElement;
  private hudScore!: HTMLElement;
  private hudHighScore!: HTMLElement;
  private hudLines!: HTMLElement;
  private hudLevel!: HTMLElement;
  private hudB2B!: HTMLElement;
  private hudCombo!: HTMLElement;
  private debugFps!: HTMLElement;
  private gameAnnouncements!: HTMLElement;
  // Modals
  private modalRelics!: HTMLElement;
  private relicCardsContainer!: HTMLElement;
  private overlayChamberIntro!: HTMLElement;
  private introChamberLabel!: HTMLElement;
  private introChamberTitle!: HTMLElement;
  private introChamberGoal!: HTMLElement;
  private introChamberAfflictionText!: HTMLElement;
  private introCountdown!: HTMLElement;
  private modalPause!: HTMLElement;
  private modalGameover!: HTMLElement;
  private summaryScore!: HTMLElement;
  private summaryStages!: HTMLElement;
  private summaryLines!: HTMLElement;
  private summaryTspins!: HTMLElement;
  private summaryTetrises!: HTMLElement;
  private summaryMaxCombo!: HTMLElement;
  private summaryRelicsList!: HTMLElement;
  private modalSettings!: HTMLElement;
  // Next canvases list
  private nextCanvases: HTMLCanvasElement[] = [];
  constructor(spriteCache: SpriteCache) {
    this.spriteCache = spriteCache;
    this.bindElements();
    document.addEventListener('keydown', event => {
      const modal = document.querySelector<HTMLElement>('.modal-backdrop:not(.hidden)');
      if (!modal) return;
      if (event.key === 'Escape' && modal === this.modalSettings) {
        event.preventDefault();
        event.stopPropagation();
        document.getElementById('btn-close-settings')!.click();
      }
      if (event.key !== 'Tab') return;
      const controls = [...modal.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)')].filter(el => el.offsetParent !== null);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
  }
  private setModal(modal: HTMLElement, show: boolean): void {
    modal.classList.toggle('hidden', !show);
    const open = !!document.querySelector('.modal-backdrop:not(.hidden)');
    document.body.style.overflow = open ? 'hidden' : '';
    document.querySelectorAll<HTMLElement>('.main-layout, .cathedral-header, #welcome-screen').forEach(el => { el.inert = open; });
    if (show) modal.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)')?.focus();
  }
  private bindElements(): void {
    this.hudStageNum = document.getElementById('hud-stage-num')!;
    this.hudStageName = document.getElementById('hud-stage-name')!;
    this.hudGoalDesc = document.getElementById('hud-goal-desc')!;
    this.hudGoalCounter = document.getElementById('hud-goal-counter')!;
    this.hudGoalProgress = document.getElementById('hud-goal-progress')!;
    this.hudModifierTitle = document.getElementById('hud-modifier-title')!;
    this.hudModifierDesc = document.getElementById('hud-modifier-desc')!;
    this.hudRelicCount = document.getElementById('hud-relic-count')!;
    this.relicsList = document.getElementById('relics-list')!;
    this.nextCanvasContainer = document.getElementById('next-canvas-container')!;
    this.holdCanvas0 = document.getElementById('hold-canvas-0') as HTMLCanvasElement;
    this.holdCanvas1 = document.getElementById('hold-canvas-1') as HTMLCanvasElement;
    this.hudScore = document.getElementById('hud-score')!;
    this.hudHighScore = document.getElementById('hud-high-score')!;
    this.hudLines = document.getElementById('hud-lines')!;
    this.hudLevel = document.getElementById('hud-level')!;
    this.hudB2B = document.getElementById('hud-b2b')!;
    this.hudCombo = document.getElementById('hud-combo')!;
    this.debugFps = document.getElementById('debug-fps')!;
    this.gameAnnouncements = document.getElementById('game-announcements')!;
    this.modalRelics = document.getElementById('modal-relics')!;
    this.relicCardsContainer = document.getElementById('relic-cards-container')!;
    this.overlayChamberIntro = document.getElementById('overlay-chamber-intro')!;
    this.introChamberLabel = document.getElementById('intro-chamber-label')!;
    this.introChamberTitle = document.getElementById('intro-chamber-title')!;
    this.introChamberGoal = document.getElementById('intro-chamber-goal')!;
    this.introChamberAfflictionText = document.getElementById('intro-chamber-affliction-text')!;
    this.introCountdown = document.getElementById('intro-countdown')!;
    this.modalPause = document.getElementById('modal-pause')!;
    this.modalGameover = document.getElementById('modal-gameover')!;
    this.summaryScore = document.getElementById('summary-score')!;
    this.summaryStages = document.getElementById('summary-stages')!;
    this.summaryLines = document.getElementById('summary-lines')!;
    this.summaryTspins = document.getElementById('summary-tspins')!;
    this.summaryTetrises = document.getElementById('summary-tetrises')!;
    this.summaryMaxCombo = document.getElementById('summary-maxcombo')!;
    this.summaryRelicsList = document.getElementById('summary-relics-list')!;
    this.modalSettings = document.getElementById('modal-settings')!;
  }
  public updateHud(stage: StageInfo, stats: RunStats, level: number): void {
    this.hudStageNum.innerText = stage.number.toString();
    this.hudStageName.innerText = stage.name;
    this.hudGoalDesc.innerText = stage.targetType === 'score' ? 'SKOR STAGE' : stage.targetValue ? `Hapus ${stage.targetValue} baris` : this.timeLimitMs ? 'Raih skor tertinggi' : 'Latihan tanpa batas';
    document.getElementById('hud-next-count-badge')!.textContent = String(this.nextCanvases.length);
    this.hudGoalCounter.innerText = stage.targetValue ? `${stage.currentProgress.toLocaleString()} / ${stage.targetValue.toLocaleString()}` : this.timeLimitMs ? `${this.timeLimitMs / 1000} detik` : '∞';
    const budget = document.getElementById('hud-piece-budget')!;
    const left = Math.max(0, stage.pieceLimit - stage.piecesUsed);
    budget.textContent = `SISA ${left} / ${stage.pieceLimit} BALOK`;
    budget.classList.toggle('budget-low', left <= 5);
    const pct = Math.min(100, Math.round(stage.targetValue ? (stage.currentProgress / stage.targetValue) * 100 : 0));
    this.hudGoalProgress.style.width = `${pct}%`;
    this.hudModifierTitle.innerText = stage.modifier.name;
    this.hudModifierDesc.innerText = stage.modifier.description;
    document.getElementById('modifier-card')!.classList.toggle('hidden', stage.modifier.id === 'none');
    this.hudScore.innerText = stats.score.toLocaleString();
    this.hudHighScore.innerText = stats.highScore.toLocaleString();
    this.hudLines.innerText = stats.lines.toString();
    this.hudLevel.innerText = level.toString();
    this.hudB2B.innerText = stats.b2bStreak.toString();
    this.hudCombo.innerText = stats.currentCombo.toString();
    this.hudRelicCount.innerText = stats.relicsCollected.length.toString();
  }
  public updateTiming(ms: number, pieces: number, best: number): void {
    this.hudTime.textContent = formatTime(this.timeLimitMs ? Math.max(0, this.timeLimitMs - ms) : ms);
    document.getElementById('hud-time-label')!.textContent = this.timeLimitMs ? 'SISA WAKTU' : 'WAKTU';
    if (this.timeLimitMs) {
      this.hudGoalProgress.style.width = `${Math.min(100, ms / this.timeLimitMs * 100)}%`;
    }
    this.hudPieces.textContent = String(pieces);
    this.hudPps.textContent = ms > 0 ? (pieces / (ms / 1000)).toFixed(2) : '0.00';
    this.hudBestTime.textContent = best > 0 ? formatTime(best) : '—';
  }
  public clearAnnouncements(): void { this.gameAnnouncements.replaceChildren(); document.getElementById('card-trigger-feed')!.replaceChildren(); }
  public cancelIntro(): void {
    clearInterval(this.introInterval);
    this.overlayChamberIntro.classList.add('hidden');
  }
  public updatePrism(charge: number, remaining: number): void {
    const active = remaining > 0;
    document.body.classList.toggle('prism-fever', active);
    document.getElementById('prism-fill')!.style.width = `${active ? remaining / 8 * 100 : charge / 12 * 100}%`;
    document.getElementById('prism-status')!.textContent = active ? `2× · ${remaining} baris lagi` : `${charge} / 12`;
    document.getElementById('prism-hint')!.textContent = active ? 'Skor clear dikali dua.' : 'Combo mengisi meter. Penuh = skor 2×.';
  }
  public showScoreBurst(score: number, combo: number): void {
    const burst = document.createElement('div');
    burst.className = 'score-burst';
    burst.textContent = `+${score.toLocaleString()}${combo > 1 ? ` · ${combo} COMBO` : ''}`;
    this.gameAnnouncements.appendChild(burst);
    setTimeout(() => burst.remove(), 1100);
  }
  public updateRelicInventory(relics: RelicDefinition[]): void {
    if (relics.length === 0) {
      this.relicsList.innerHTML = '<div class="empty-relic-msg">Belum ada kartu aktif. Beli kartu di shop untuk membangun sinergi.</div>';
      return;
    }
    this.relicsList.innerHTML = '';
    relics.forEach(r => {
      const el = document.createElement('div');
      el.className = `relic-pill rarity-${r.rarity}`;
      el.dataset.card = r.id;
      el.title = `${r.buffDescription}${r.curseDescription ? ' | ' + r.curseDescription : ''}`;
      el.innerHTML = `
        <span class="relic-pill-icon">${r.icon}</span>
        <div class="relic-pill-info">
          <span class="relic-pill-name">${r.name}</span>
          <span class="relic-pill-summary">${r.buffDescription}</span>${r.curseDescription ? `<span class="inventory-curse">${r.curseDescription}</span>` : ''}
        </div>
      `;
      this.relicsList.appendChild(el);
    });
  }
  public updateBuildStatus(run: RunManager): void {
    document.getElementById('hud-build-name')!.textContent = run.starterBuild?.toUpperCase() ?? '';
    const text = run.starterBuild === 'combo' ? `SAFETY NET · ${run.comboRescueUsed ? 'Terpakai · pulih stage berikutnya' : '1 penyelamatan combo siap'}`
      : run.starterBuild === 'demolition' ? `BLAST CORE · ${run.blastCharge}/6 energi${run.blastCharge === 6 ? ' · BOM SIAP' : ''}`
      : run.starterBuild === 'gambler' ? `KONTRAK · ${run.contract === 'active' ? `${run.contractProgress}/3 clear ≥2 baris` : run.contract === 'won' ? 'MENANG · hadiah dibayar' : 'Belum diambil di shop'}` : '';
    document.getElementById('hud-build-status')!.textContent = text;
    document.getElementById('build-status')!.classList.toggle('hidden', !run.starterBuild);
    const blast = document.getElementById('btn-blast') as HTMLButtonElement;
    blast.classList.toggle('hidden', run.starterBuild !== 'demolition');
    blast.disabled = run.blastCharge < 6;
  }

  public showCardTriggers(triggers: CardTrigger[]): void {
    if (triggers.length === 0) return;
    const feed = document.getElementById('card-trigger-feed')!;
    feed.replaceChildren();
    for (const [index, trigger] of triggers.entries()) {
      const item = document.createElement('span');
      item.className = 'card-trigger';
      const card = this.relicsList.querySelector<HTMLElement>(`[data-card="${trigger.id}"]`);
      const name = card?.querySelector('.relic-pill-name')?.textContent ?? '';
      item.textContent = `${name}${name ? ' · ' : ''}${trigger.text}`;
      item.style.animationDelay = `${index * 70}ms`;
      feed.appendChild(item);
      if (card) {
        card.classList.remove('card-fired');
        void card.offsetWidth;
        card.style.animationDelay = `${index * 70}ms`;
        card.classList.add('card-fired');
      }
    }
  }

  public renderHoldCanvases(holdSlots: (TetrominoType | null)[], maxSlots: number): void {
    Renderer.renderPieceToMiniCanvas(this.holdCanvas0, holdSlots[0] || null, this.spriteCache);
    if (maxSlots > 1) {
      this.holdCanvas1.classList.remove('hidden');
      Renderer.renderPieceToMiniCanvas(this.holdCanvas1, holdSlots[1] || null, this.spriteCache);
    } else {
      this.holdCanvas1.classList.add('hidden');
    }
  }
  public renderNextQueue(nextPieces: TetrominoType[]): void {
    document.getElementById('hud-next-count-badge')!.textContent = String(nextPieces.length);
    // Synchronize canvas count
    while (this.nextCanvases.length < nextPieces.length) {
      const c = document.createElement('canvas');
      c.className = 'next-slot-canvas';
      c.width = 110;
      c.height = 70;
      this.nextCanvasContainer.appendChild(c);
      this.nextCanvases.push(c);
    }
    while (this.nextCanvases.length > nextPieces.length) {
      const c = this.nextCanvases.pop();
      if (c && c.parentElement) {
        c.parentElement.removeChild(c);
      }
    }
    // Render pieces
    for (let i = 0; i < nextPieces.length; i++) {
      Renderer.renderPieceToMiniCanvas(this.nextCanvases[i], nextPieces[i], this.spriteCache);
    }
  }
  public showAnnouncement(text: string): void {
    const el = document.createElement('div');
    el.className = 'toast-msg';
    el.innerText = text;
    this.gameAnnouncements.appendChild(el);
    setTimeout(() => {
      if (el.parentElement) {
        el.parentElement.removeChild(el);
      }
    }, 1300);
  }
  public showChamberIntro(stage: StageInfo, onComplete: () => void, onCount?: (count: number) => void): void {
    clearInterval(this.introInterval);
    this.overlayChamberIntro.classList.remove('hidden');
    this.introChamberLabel.innerText = 'BERSIAP';
    this.introChamberTitle.innerText = stage.name;
    this.introChamberGoal.innerText = stage.targetType === 'score' ? `${stage.targetValue.toLocaleString()} skor · ${stage.pieceLimit} balok` : stage.targetValue ? `Hapus ${stage.targetValue} baris` : this.timeLimitMs ? `${this.timeLimitMs / 1000} detik · raih skor tertinggi` : 'Tanpa batas · papan baru saat penuh';
    this.introChamberAfflictionText.parentElement!.classList.toggle('hidden', stage.modifier.id === 'none');
    this.introChamberAfflictionText.innerText = stage.modifier.id === 'none'
      ? ''
      : `${stage.modifier.name} - ${stage.modifier.description}`;
    let count = 3;
    onCount?.(count);
    this.introCountdown.innerText = count.toString();
    this.introInterval = setInterval(() => {
      count--;
      onCount?.(count);
      if (count > 0) {
        this.introCountdown.innerText = count.toString();
      } else {
        clearInterval(this.introInterval);
        this.overlayChamberIntro.classList.add('hidden');
        onComplete();
      }
    }, 550);
  }
  public updateWallet(coins: number): void {
    document.getElementById('hud-coins')!.textContent = `$${coins}`;
  }

  public showShop(run: RunManager, hasStack: boolean, onAction: (action: string, value?: string) => void): void {
    const full = run.relics.length >= run.cardSlots;
    const needsStarter = !run.starterBuild;
    document.getElementById('starter-picker')!.classList.toggle('hidden', run.stage.number !== 1);
    document.getElementById('starter-choice')!.textContent = run.starterBuild ? `${run.starterBuild.toUpperCase()} dipilih · kartu starter tetap selama run.` : 'Pilih cara bermain sebelum belanja.';
    this.modalRelics.querySelectorAll<HTMLButtonElement>('[data-starter]').forEach(button => {
      button.disabled = !needsStarter;
      button.setAttribute('aria-pressed', String(button.dataset.starter === run.starterBuild));
      button.onclick = () => onAction('starter', button.dataset.starter);
    });
    document.getElementById('shop-contract')!.classList.toggle('hidden', run.starterBuild !== 'gambler');
    const contract = document.getElementById('btn-contract') as HTMLButtonElement;
    contract.disabled = run.contract !== 'off';
    contract.textContent = run.contract === 'off' ? 'AMBIL KONTRAK' : 'KONTRAK DIAMBIL';
    contract.onclick = () => onAction('contract');
    this.updateBuildStatus(run);
    document.getElementById('shop-wallet')!.textContent = `$${run.coins}`;
    document.getElementById('shop-receipt')!.textContent = run.shopReceipt;
    document.getElementById('shop-round')!.textContent = `STAGE ${String(run.stage.number).padStart(2, '0')}`;
    document.getElementById('shop-next-rule')!.textContent = `${run.stage.targetValue.toLocaleString()} skor · ${run.stage.pieceLimit} balok · ${run.stage.modifier.name}: ${run.stage.modifier.description}`;
    this.relicCardsContainer.replaceChildren();
    for (const [index, card] of run.shopOffers.entries()) {
      const el = document.createElement('article');
      el.className = card ? `relic-card rarity-${card.rarity}` : 'relic-card sold-card';
      if (!card) { el.innerHTML = '<span class="sold-label">SOLD</span><p>Kartu sudah masuk build.</p>'; }
      else {
        const disabled = needsStarter || full || run.coins < card.price;
        el.innerHTML = `<div class="card-corner">${String(index + 1).padStart(2, '0')} <span>${card.rarity}</span></div>
          <div class="card-art" aria-hidden="true"><span>${card.icon}</span></div>
          <span class="relic-subtitle">${card.subtitle}</span><h3 class="relic-title">${card.name}</h3>
          <div class="relic-effects-list"><p class="relic-effect-badge buff">${card.buffDescription}</p>
          ${card.curseDescription ? `<p class="relic-effect-badge curse">${card.curseDescription}</p>` : ''}</div>
          <button class="btn card-buy" data-buy="${index}" ${disabled ? 'disabled' : ''}>${full ? '6 SLOT PENUH' : `BELI $${card.price} [${index + 1}]`}</button>`;
      }
      this.relicCardsContainer.appendChild(el);
    }
    const inventory = document.getElementById('shop-inventory')!;
    inventory.innerHTML = run.relics.length ? '' : '<p class="empty-relic-msg">Enam slot. Gabungkan kartu skor, kontrol, dan ekonomi.</p>';
    for (const card of run.relics) {
      const el = document.createElement('div'); el.className = `shop-owned rarity-${card.rarity}`;
      el.innerHTML = `<span class="owned-icon" aria-hidden="true">${card.icon}</span><span>${card.name}</span>${card.price === 0 ? '<small>STARTER</small>' : `<button class="btn" data-sell="${card.id}">JUAL $${Math.floor(card.price / 2)}</button>`}`;
      inventory.appendChild(el);
    }
    document.getElementById('shop-slots')!.textContent = `${run.relics.length} / ${run.cardSlots}`;
    const reroll = document.getElementById('btn-shop-reroll') as HTMLButtonElement;
    reroll.textContent = `REROLL $${run.rerollCost}`; reroll.disabled = needsStarter || run.coins < run.rerollCost;
    const repair = document.getElementById('btn-shop-repair') as HTMLButtonElement;
    repair.disabled = !hasStack || run.repairBought || run.coins < 5;
    repair.textContent = run.repairBought ? 'REPAIR TERPAKAI' : 'REPAIR $5';
    this.modalRelics.querySelectorAll<HTMLElement>('[data-buy]').forEach(el => el.onclick = () => onAction('buy', el.dataset.buy));
    this.modalRelics.querySelectorAll<HTMLElement>('[data-sell]').forEach(el => el.onclick = () => onAction('sell', el.dataset.sell));
    reroll.onclick = () => onAction('reroll'); repair.onclick = () => onAction('repair');
    const play = document.getElementById('btn-shop-continue') as HTMLButtonElement;
    play.disabled = needsStarter;
    play.onclick = () => onAction('continue');
    if (this.modalRelics.classList.contains('hidden')) this.setModal(this.modalRelics, true);
    else if (!this.modalRelics.contains(document.activeElement) || (document.activeElement as HTMLButtonElement)?.disabled) this.modalRelics.focus({ preventScroll: true });
  }

  public hideRelicSelection(): void {
    this.setModal(this.modalRelics, false);
  }
  public showPauseModal(show: boolean): void { this.setModal(this.modalPause, show); }

  public showGameOverModal(stats: RunStats, completed: boolean, elapsed: number, pieces: number, best: number, mode: GameMode = 'sprint'): void {
    document.getElementById('gameover-title')!.textContent = completed ? mode === 'sprint' ? '40 baris selesai' : this.timeLimitMs && elapsed >= this.timeLimitMs ? 'TIME UP!' : 'Target tercapai' : 'Permainan selesai';
    document.getElementById('gameover-subtitle')!.textContent = completed ? mode === 'sprint' ? 'Sprint selesai. Coba pecahkan waktu ini.' : 'Sesi selesai. Coba tingkatkan skor ini.' : 'Coba lagi atau pilih mode lain.';
    document.getElementById('summary-time')!.textContent = formatTime(elapsed);
    document.getElementById('summary-pieces')!.textContent = String(pieces);
    document.getElementById('summary-best')!.textContent = best > 0 ? formatTime(best) : '—';
    this.setModal(this.modalGameover, true);
    this.summaryScore.innerText = stats.score.toLocaleString();
    this.summaryStages.innerText = stats.chambersCleared.toString();
    this.summaryLines.innerText = stats.lines.toString();
    this.summaryTspins.innerText = stats.tspins.toString();
    this.summaryTetrises.innerText = stats.tetrises.toString();
    this.summaryMaxCombo.innerText = stats.maxCombo.toString();
    this.summaryRelicsList.innerHTML = '';
    if (stats.relicsCollected.length === 0) {
      this.summaryRelicsList.innerHTML = '<div class="empty-relic-msg">Belum ada upgrade.</div>';
    } else {
      stats.relicsCollected.forEach(r => {
        const item = document.createElement('div');
        item.className = 'relic-pill';
        item.innerHTML = `
          <span class="relic-pill-icon">${r.icon}</span>
          <div class="relic-pill-info">
            <span class="relic-pill-name">${r.name}</span>
            <span class="relic-pill-summary">${r.buffDescription}</span>${r.curseDescription ? `<span class="inventory-curse">${r.curseDescription}</span>` : ''}
          </div>
        `;
        this.summaryRelicsList.appendChild(item);
      });
    }
  }
  public hideGameOverModal(): void {
    this.setModal(this.modalGameover, false);
  }
  public showSettingsModal(show: boolean): void { this.setModal(this.modalSettings, show); }

  public updateFps(fps: number): void {
    this.debugFps.innerText = `FPS: ${fps}`;
  }
  public toggleFpsVisible(): void {
    this.debugFps.classList.toggle('hidden');
  }
}
