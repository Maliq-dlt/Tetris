/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Run Manager & Parameter Synthesizer
 */

import { DEFAULT_LOCK_DELAY_MS, DEFAULT_MAX_LOCK_RESETS } from '../core/constants';
import { CardTrigger, GameMode, RelicDefinition, RunStats, SoloRules, StageInfo, StarterBuild, TetrominoType, TSpinResult } from '../core/types';
import { calculateClearScore } from '../core/scoring';
import { ALL_RELICS, getRandomRelicChoices } from './relics';
import { generateStage } from './stage';

const STORAGE_KEY_HIGH_SCORE = 'vitrail_tetris_highscore';

export class RunManager {
  public mode: GameMode = 'roguelite';
  public coins = 8;
  public readonly cardSlots = 6;
  public shopOpen = false;
  public shopOffers: (RelicDefinition | null)[] = [];
  public rerollCost = 2;
  public shopReceipt = 'Modal awal $8. Pilih build, atau simpan untuk bunga.';
  public repairBought = false;
  public starterBuild: StarterBuild | null = null;
  public comboRescueUsed = false;
  public blastCharge = 0;
  public contract: 'off' | 'active' | 'won' | 'lost' = 'off';
  public contractProgress = 0;
  private paidStage = 0;
  private stageStartScore = 0;
  public rules: SoloRules = { targetLines: 40, timeLimitMs: 0, level: 1 };
  public get level(): number {
    if (this.mode === 'roguelite') return this.stage.number;
    if (this.mode === 'blitz') return Math.min(15, 1 + Math.floor(this.stats.lines / 5));
    return this.rules.level;
  }

  /** Returns true exactly when a timed solo session reaches its limit. */
  public tick(dtMs: number): boolean {
    if (!Number.isFinite(dtMs) || dtMs <= 0) return false;
    const limit = this.rules.timeLimitMs;
    if (limit && this.elapsedMs >= limit) return false;
    this.elapsedMs += dtMs;
    if (limit && this.elapsedMs >= limit) { this.elapsedMs = limit; return true; }
    return false;
  }

  public elapsedMs = 0;
  public pieces = 0;
  public bestSprintMs = 0;
  public stage: StageInfo;
  public relics: RelicDefinition[] = [];
  public stats: RunStats;
  public secondChanceUsed = false;
  public periodicGarbageElapsed = 0;
  public prismCharge = 0;
  public feverLines = 0;

  constructor() {
    this.stage = generateStage(1);
    this.stats = {
      score: 0,
      highScore: this.loadHighScore(),
      lines: 0,
      chambersCleared: 0,
      tspins: 0,
      tetrises: 0,
      maxCombo: 0,
      currentCombo: 0,
      b2bStreak: 0,
      relicsCollected: []
    };
  }

  public resetRun(mode: GameMode = this.mode, custom: SoloRules = this.rules): void {
    const bounded = (value: number, min: number, max: number, fallback: number) => Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
    this.rules = mode === 'custom' ? {
      targetLines: bounded(custom.targetLines, 0, 1000, 40),
      timeLimitMs: bounded(custom.timeLimitMs, 0, 3600000, 0),
      level: bounded(custom.level, 1, 15, 1)
    } : { targetLines: mode === 'sprint' ? 40 : 0, timeLimitMs: mode === 'blitz' ? 120000 : 0, level: 1 };
    this.mode = mode;
    this.coins = mode === 'roguelite' ? 8 : 0;
    this.shopOpen = false;
    this.shopOffers = [];
    this.paidStage = 0;
    this.stageStartScore = 0;
    this.rerollCost = 2;
    this.shopReceipt = 'Modal awal $8. Pilih build, atau simpan untuk bunga.';
    this.repairBought = false;
    this.starterBuild = null;
    this.comboRescueUsed = false;
    this.blastCharge = 0;
    this.contract = 'off';
    this.contractProgress = 0;
    this.elapsedMs = 0;
    this.pieces = 0;
    this.bestSprintMs = 0;
    try {
      const best = Number(localStorage.getItem('vitrail_sprint_best_ms'));
      if (Number.isFinite(best) && best > 0) this.bestSprintMs = best;
    } catch { /* Storage is optional. */ }
    this.stage = generateStage(1);
    if (mode !== 'roguelite') {
      this.stage.name = { sprint: '40 LINES', blitz: 'BLITZ', zen: 'ZEN', custom: 'CUSTOM' }[mode];
      this.stage.targetType = 'lines';
      this.stage.pieceLimit = 0;
      this.stage.targetValue = this.rules.targetLines;
    }
    this.relics = [];
    this.secondChanceUsed = false;
    this.periodicGarbageElapsed = 0;
    this.prismCharge = 0;
    this.feverLines = 0;
    this.stats = {
      score: 0,
      highScore: this.loadHighScore(),
      lines: 0,
      chambersCleared: 0,
      tspins: 0,
      tetrises: 0,
      maxCombo: 0,
      currentCombo: 0,
      b2bStreak: 0,
      relicsCollected: []
    };
  }

  private loadHighScore(): number {
    try {
      const stored = localStorage.getItem(this.mode === 'roguelite' ? STORAGE_KEY_HIGH_SCORE : `vitrail_${this.mode}_highscore`);
      const score = Number(stored);
      return Number.isFinite(score) && score >= 0 ? score : 0;
    } catch {
      return 0;
    }
  }

  public saveHighScore(score: number): void {
    if (score > this.stats.highScore) {
      this.stats.highScore = score;
      try {
        localStorage.setItem(this.mode === 'roguelite' ? STORAGE_KEY_HIGH_SCORE : `vitrail_${this.mode}_highscore`, score.toString());
      } catch {
        // Storage not available
      }
    }
  }

  public addScore(points: number): void {
    this.stats.score += points;
    if (this.stats.score > this.stats.highScore) {
      this.saveHighScore(this.stats.score);
    }
  }

  public addLines(count: number): boolean {
    this.stats.lines += count;
    if (this.stage.targetType !== 'lines') return false;
    this.stage.currentProgress += count;

    if (this.stage.targetValue > 0 && this.stage.currentProgress >= this.stage.targetValue && !this.stage.cleared) {
      this.stage.cleared = true;
      if (this.mode === 'roguelite') this.stats.chambersCleared++;
      return true; // Chamber cleared!
    }
    return false;
  }

  public chooseStarter(build: string): boolean {
    const ids = { combo: 'safety_net', demolition: 'blast_core', gambler: 'double_or_nothing' };
    if (!Object.hasOwn(ids, build) || !this.shopOpen || this.stage.number !== 1 || this.pieces !== 0 || this.starterBuild || this.relics.length >= this.cardSlots) return false;
    this.starterBuild = build as StarterBuild;
    this.addRelic(ALL_RELICS.find(r => r.id === ids[build as StarterBuild])!);
    return true;
  }

  public acceptContract(): boolean {
    if (!this.shopOpen || !this.hasRelic('double_or_nothing') || this.contract !== 'off') return false;
    this.contract = 'active';
    return true;
  }

  public recordPlacement(): void {
    this.pieces++;
    if (this.mode === 'roguelite') this.stage.piecesUsed++;
  }

  /** Drop points stay in the total score, but only clear/bomb/contract points meet the stage target. */
  public addClearScore(points: number): void {
    if (!Number.isFinite(points) || points < 0 || this.stage.cleared) return;
    this.addScore(Math.floor(points));
    if (this.mode === 'roguelite') this.stage.currentProgress += Math.floor(points);
  }

  public finishPlacement(): 'cleared' | 'failed' | null {
    if (this.mode !== 'roguelite' || this.stage.cleared || this.shopOpen) return null;
    if (this.stage.currentProgress >= this.stage.targetValue) {
      this.stage.cleared = true;
      this.stats.chambersCleared++;
      return 'cleared';
    }
    return this.stage.piecesUsed >= this.stage.pieceLimit ? 'failed' : null;
  }

  public scorePlacement(lines: number, tspin: TSpinResult, perfect: boolean) {
    const triggers: CardTrigger[] = [];
    const trigger = (id: string, text: string) => { if (this.hasRelic(id)) triggers.push({ id, text }); };
    if (lines > 0) this.stats.currentCombo++;
    else if (this.mode === 'roguelite' && this.stats.currentCombo > 0 && this.hasRelic('safety_net') && !this.comboRescueUsed) {
      this.comboRescueUsed = true;
      trigger('safety_net', 'Combo terselamatkan · 1× per stage');
    } else this.stats.currentCombo = 0;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.currentCombo);
    const prism = this.registerPrismClear(lines, this.stats.currentCombo);
    // A rescued chain retains its next bonus without scoring an empty placement.
    const result = calculateClearScore(lines, tspin, this.level, this.stats.b2bStreak > 0,
      lines > 0 ? Math.max(0, this.stats.currentCombo - 1) : 0, perfect,
      this.getEffectiveB2BMultiplier(), this.getEffectiveComboBonus(), this.getEffectiveScoreMultiplier() * prism.multiplier);
    if (tspin !== 'none' && this.hasRelic('martyrs_shard')) { result.finalScore *= 2; trigger('martyrs_shard', 'T-spin ×2'); }
    if (lines === 1 && tspin === 'none' && this.hasRelic('martyrs_shard')) { result.finalScore = 0; trigger('martyrs_shard', 'Single · 0 skor'); }
    if (perfect && this.hasRelic('crucible_of_light')) { result.finalScore += 10000; trigger('crucible_of_light', 'Perfect clear +10.000'); }
    if (result.finalScore > 0) for (const card of this.relics) {
      if (card.effects.scoreMultiplier) trigger(card.id, `Skor ×${card.effects.scoreMultiplier}`);
      if (card.effects.scorePerRelic) trigger(card.id, `Koleksi +${Math.round(card.effects.scorePerRelic * this.relics.length * 100)}%`);
      if (card.effects.lowWalletMultiplier && this.coins < 3) trigger(card.id, 'Saldo rendah · ×2');
      if (lines > 0 && this.stats.currentCombo > 1 && card.effects.comboBonusFlat) trigger(card.id, `Combo ${this.stats.currentCombo}`);
      if (lines > 0 && result.isDifficultClear && this.stats.b2bStreak > 0 && card.effects.b2bScoreMultiplier) trigger(card.id, 'B2B ×2,2');
    }
    this.addClearScore(result.finalScore);
    const coins = this.awardClearCoins(lines, this.stats.currentCombo);
    if (lines > 0) for (const card of this.relics) {
      const earned = (card.effects.coinsPerClear ?? 0) + (this.stats.currentCombo >= 3 ? card.effects.comboCoins ?? 0 : 0);
      if (earned) trigger(card.id, `+$${earned}`);
    }
    if (lines > 0 && this.hasRelic('blast_core')) {
      const wasReady = this.blastCharge === 6;
      this.blastCharge = Math.min(6, this.blastCharge + lines);
      trigger('blast_core', !wasReady && this.blastCharge === 6 ? 'BOM SIAP · tekan B' : `Energi ${this.blastCharge}/6`);
    }
    if (this.contract === 'active' && lines >= 2) {
      this.contractProgress++;
      trigger('double_or_nothing', `Kontrak ${this.contractProgress}/3`);
      if (this.contractProgress === 3) {
        this.contract = 'won';
        this.addClearScore(1200 * this.level);
        this.coins += 4;
        trigger('double_or_nothing', `MENANG · +${1200 * this.level} skor · +$4`);
      }
    }
    return { ...result, prism, coins, triggers };
  }

  public detonateBlast(destroy: () => number): number {
    if (this.mode !== 'roguelite' || this.shopOpen || !this.hasRelic('blast_core') || this.blastCharge < 6 || this.stage.cleared) return 0;
    const removed = destroy();
    if (removed <= 0) return 0;
    this.blastCharge = 0;
    const score = removed * 40 * this.level;
    this.addClearScore(score);
    return score;
  }

  public finishSprint(): boolean {
    if (this.mode !== 'sprint' || this.stats.lines < 40 || this.elapsedMs <= 0) return false;
    if (this.bestSprintMs === 0 || this.elapsedMs < this.bestSprintMs) {
      this.bestSprintMs = this.elapsedMs;
      try { localStorage.setItem('vitrail_sprint_best_ms', String(this.bestSprintMs)); }
      catch { /* Keep the record for this session if storage is unavailable. */ }
    }
    return true;
  }

  public advanceToNextStage(): void {
    this.stageStartScore = this.stats.score;
    this.stage = generateStage(this.stage.number + 1);
    this.periodicGarbageElapsed = 0;
    this.comboRescueUsed = false;
    this.contract = 'off';
    this.contractProgress = 0;
    this.stats.currentCombo = 0;
  }

  /** Fever lasts for eight cleared lines; a placement without a clear cools charge. */
  public registerPrismClear(lines: number, combo: number): { multiplier: number; activated: boolean } {
    if (this.mode !== 'roguelite') return { multiplier: 1, activated: false };
    if (lines === 0) {
      this.prismCharge = Math.max(0, this.prismCharge - 1);
      return { multiplier: 1, activated: false };
    }
    if (this.feverLines > 0) {
      this.feverLines = Math.max(0, this.feverLines - lines);
      return { multiplier: 2, activated: false };
    }
    this.prismCharge = Math.min(12, this.prismCharge + lines + Math.min(3, Math.max(0, combo - 1)));
    if (this.prismCharge === 12) {
      this.prismCharge = 0;
      this.feverLines = 8;
      return { multiplier: 2, activated: true };
    }
    return { multiplier: 1, activated: false };
  }

  public getRelicChoices(count = 3): RelicDefinition[] {
    const currentIds = this.relics.map(r => r.id);
    return getRandomRelicChoices(count, currentIds);
  }

  public addRelic(relic: RelicDefinition): void {
    if (this.hasRelic(relic.id) || this.relics.length >= this.cardSlots) return;
    this.relics.push(relic);
    this.stats.relicsCollected.push(relic);
  }

  public openShop(): boolean {
    if (this.mode !== 'roguelite' || this.shopOpen) return false;
    if (this.stage.number > 1 && this.paidStage !== this.stage.number - 1) return false;
    this.shopOpen = true;
    this.rerollCost = 2;
    this.repairBought = false;
    this.rollOffers();
    return true;
  }

  private rollOffers(): void {
    this.shopOffers = this.getRelicChoices(3);
    // Keep the opening market playable even when all three random cards are expensive.
    if (this.stage.number === 1 && this.relics.length === 0 && !this.shopOffers.some(r => r && r.price <= this.coins)) {
      const affordable = this.getRelicChoices(20).find(r => r.price <= this.coins);
      if (affordable) this.shopOffers[0] = affordable;
    }
  }

  public buyCard(index: number): boolean {
    const card = Number.isInteger(index) ? this.shopOffers[index] : null;
    if (!this.shopOpen || !this.starterBuild || !card || this.coins < card.price || this.relics.length >= this.cardSlots || this.hasRelic(card.id)) return false;
    this.coins -= card.price;
    this.addRelic(card);
    this.shopOffers[index] = null;
    return true;
  }

  public sellCard(id: string): boolean {
    const card = this.relics.find(r => r.id === id);
    if (!this.shopOpen || !card || card.price === 0) return false;
    this.coins += Math.floor(card.price / 2);
    this.relics = this.relics.filter(r => r.id !== id);
    this.stats.relicsCollected = [...this.relics];
    return true;
  }

  public rerollShop(): boolean {
    if (!this.shopOpen || !this.starterBuild || this.coins < this.rerollCost) return false;
    this.coins -= this.rerollCost++;
    this.rollOffers();
    return true;
  }

  public buyRepair(hasStack: boolean): boolean {
    if (!this.shopOpen || !hasStack || this.repairBought || this.coins < 5) return false;
    this.coins -= 5;
    this.repairBought = true;
    return true;
  }

  public closeShop(): boolean {
    if (!this.shopOpen || !this.starterBuild) return false;
    this.shopOpen = false;
    this.shopOffers = [];
    return true;
  }

  public awardClearCoins(lines: number, combo: number): number {
    if (this.mode !== 'roguelite' || lines <= 0) return 0;
    let earned = 0;
    for (const card of this.relics) {
      earned += card.effects.coinsPerClear ?? 0;
      if (combo >= 3) earned += card.effects.comboCoins ?? 0;
    }
    this.coins += earned;
    return earned;
  }

  public settleStage(): boolean {
    if (this.mode !== 'roguelite' || !this.stage.cleared || this.paidStage === this.stage.number) return false;
    if (this.contract === 'active') { this.contract = 'lost'; this.coins = Math.max(0, this.coins - 3); }
    const base = 5 + this.stage.number;
    const scoreBonus = Math.min(8, Math.floor(Math.max(0, this.stats.score - this.stageStartScore) / 2000));
    const cap = 5 + this.relics.reduce((sum, r) => sum + (r.effects.interestCapBonus ?? 0), 0);
    const interest = Math.min(cap, Math.floor(this.coins / 5));
    const cards = this.relics.reduce((sum, r) => sum + (r.effects.roundCoins ?? 0), 0);
    const total = base + scoreBonus + interest + cards;
    this.coins += total;
    this.paidStage = this.stage.number;
    this.shopReceipt = `${this.contract === 'lost' ? 'Kontrak gagal −$3 (sebatas saldo) · ' : ''}Ronde ${this.stage.number} +$${base} · skor +$${scoreBonus} · bunga +$${interest} · kartu +$${cards} = +$${total}`;
    return true;
  }

  public getEffectiveDasModifier(): number {
    return this.relics.reduce((sum, r) => sum + (r.effects.dasModifier ?? 0), 0);
  }

  public hasRelic(id: string): boolean {
    return this.relics.some(r => r.id === id);
  }

  // Parameter calculation based on base, active relics, and chamber modifier:

  public getEffectiveHoldSlots(): number {
    let slots = 1;
    for (const r of this.relics) {
      if (r.effects.holdSlotBonus) slots += r.effects.holdSlotBonus;
    }
    return Math.min(slots, 2);
  }

  public getEffectivePreviews(): number {
    // Stage debuff override
    if (this.stage.modifier.effects.previewCountOverride !== undefined) {
      return this.stage.modifier.effects.previewCountOverride;
    }

    let previews = 5;
    for (const r of this.relics) {
      if (r.effects.previewBonus) previews += r.effects.previewBonus;
    }
    if (this.hasRelic('faceted_oculus')) {
      previews = Math.min(previews, 3);
    }
    return Math.max(1, Math.min(previews, 7));
  }

  public getEffectiveLockDelay(): number {
    if (this.stage.modifier.effects.lockDelayOverride !== undefined) {
      return this.stage.modifier.effects.lockDelayOverride;
    }

    let delay = DEFAULT_LOCK_DELAY_MS;
    for (const r of this.relics) {
      if (r.effects.lockDelayModifier) delay += r.effects.lockDelayModifier;
    }
    return Math.max(200, delay);
  }

  public getEffectiveMaxLockResets(): number {
    let resets = DEFAULT_MAX_LOCK_RESETS;
    for (const r of this.relics) {
      if (r.effects.maxLockResetsBonus) resets += r.effects.maxLockResetsBonus;
    }
    return resets;
  }

  public getEffectiveGravityInterval(level: number): number {
    // Guideline curve: (0.8 - ((level - 1) * 0.007))^(level - 1) in seconds
    const baseSeconds = Math.pow(Math.max(0.05, 0.8 - ((level - 1) * 0.007)), level - 1);
    let ms = Math.max(80, baseSeconds * 1000);

    let mult = 1.0;
    if (this.stage.modifier.effects.gravityMultiplier) {
      mult *= this.stage.modifier.effects.gravityMultiplier;
    }
    for (const r of this.relics) {
      if (r.effects.gravityMultiplier) mult *= r.effects.gravityMultiplier;
    }

    return ms / mult;
  }

  public getEffectiveScoreMultiplier(): number {
    let mult = 1.0;
    for (const r of this.relics) {
      if (r.effects.scoreMultiplier) mult *= r.effects.scoreMultiplier;
    }
    for (const r of this.relics) {
      if (r.effects.scorePerRelic) mult *= 1 + r.effects.scorePerRelic * this.relics.length;
      if (r.effects.lowWalletMultiplier && this.coins < 3) mult *= r.effects.lowWalletMultiplier;
    }
    return mult;
  }

  public getEffectiveB2BMultiplier(): number {
    let mult = 1.5;
    for (const r of this.relics) {
      if (r.effects.b2bScoreMultiplier) mult = r.effects.b2bScoreMultiplier;
    }
    return mult;
  }

  public getEffectiveComboBonus(): number {
    let bonus = 50;
    for (const r of this.relics) {
      if (r.effects.comboBonusFlat) bonus = r.effects.comboBonusFlat;
    }
    return bonus;
  }

  public getGhostPieceEnabled(): boolean {
    if (this.stage.modifier.effects.disableGhostPiece) {
      return false;
    }
    return true;
  }

  public getPeriodicGarbageInterval(): number | null {
    // Check if modifier or relic applies periodic garbage
    let minInterval: number | null = null;
    if (this.stage.modifier.effects.periodicGarbageSecs) {
      minInterval = this.stage.modifier.effects.periodicGarbageSecs;
    }
    for (const r of this.relics) {
      if (r.effects.periodicGarbageSecs) {
        minInterval = minInterval ? Math.min(minInterval, r.effects.periodicGarbageSecs) : r.effects.periodicGarbageSecs;
      }
    }
    return minInterval;
  }

  public getExcludedPieces(): TetrominoType[] {
    const list: TetrominoType[] = [];
    if (this.stage.modifier.effects.excludePiece) {
      list.push(this.stage.modifier.effects.excludePiece);
    }
    for (const r of this.relics) {
      if (r.effects.excludedPieces) {
        list.push(...r.effects.excludedPieces);
      }
    }
    return list;
  }

  public getGuaranteedPieceRule(): { type: TetrominoType; interval: number } | null {
    for (const r of this.relics) {
      if (r.effects.guaranteedPieceInterval) {
        return r.effects.guaranteedPieceInterval;
      }
    }
    return null;
  }
}
