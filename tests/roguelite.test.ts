import { describe, expect, it } from 'vitest';
import { RunManager } from '../src/roguelite/runManager';
import { Board } from '../src/core/board';
import { createPiece } from '../src/core/piece';
import { generateStage } from '../src/roguelite/stage';
import { ALL_RELICS } from '../src/roguelite/relics';
import type { StarterBuild } from '../src/core/types';

function start(build: StarterBuild = 'combo') {
  const run = new RunManager();
  run.resetRun('roguelite'); run.openShop(); run.chooseStarter(build); run.closeShop();
  return run;
}

describe('score trials', () => {
  it('counts scoring clears, excludes drop points and line totals, and settles once', () => {
    const run = start();
    run.addScore(99999);
    run.addLines(40);
    expect(run.stage.currentProgress).toBe(0);
    expect(run.finishPlacement()).toBeNull();
    const board = new Board();
    for (let y = 20; y < 24; y++) for (let x = 0; x < 9; x++) board.grid[y][x] = 'J';
    const piece = createPiece('I'); piece.rotation = 1; piece.x = 7; piece.y = 20;
    board.lockPiece(piece);
    const lines = board.clearFullLines().length;
    run.recordPlacement();
    const result = run.scorePlacement(lines, 'none', board.isPerfectClear()); run.addLines(lines);
    expect(result.finalScore).toBe(2800);
    expect(run.stage.currentProgress).toBe(2800);
    expect(run.finishPlacement()).toBe('cleared');
    expect(run.finishPlacement()).toBeNull();
    expect(run.stats.chambersCleared).toBe(1);
    expect(run.settleStage()).toBe(true);
    expect(run.settleStage()).toBe(false);
    run.advanceToNextStage();
    expect(run.stage.currentProgress).toBe(0);
    expect(run.stage.piecesUsed).toBe(0);
    expect(run.stage.targetValue).toBeGreaterThan(1500);
    expect(run.openShop()).toBe(true);
  });
  it('fails on the last unscored placement, but a winning final placement takes priority', () => {
    const lost = start();
    for (let i = 0; i < 40; i++) { lost.recordPlacement(); lost.scorePlacement(0, 'none', false); }
    expect(lost.finishPlacement()).toBe('failed');
    expect(lost.stage.cleared).toBe(false);
    expect(lost.settleStage()).toBe(false);
    const won = start(); won.stage.piecesUsed = 39;
    won.recordPlacement(); won.addClearScore(won.stage.targetValue);
    expect(won.finishPlacement()).toBe('cleared');
  });
  it('keeps targets finite and increasing and solo modes independent of starter rules', () => {
    let previous = 0;
    for (let stage = 1; stage <= 30; stage++) {
      const next = generateStage(stage);
      expect(next.targetValue).toBeGreaterThan(0);
      expect(Number.isFinite(next.targetValue)).toBe(true);
      // Random target-extra stages may exceed the following normal stage.
      const base = next.targetValue / (next.modifier.effects.targetMultiplier ?? 1);
      expect(base).toBeGreaterThan(previous); previous = base;
    }
    const run = start('demolition'); run.blastCharge = 6;
    run.resetRun('sprint');
    expect(run.stage.targetType).toBe('lines'); expect(run.stage.pieceLimit).toBe(0);
    expect(run.starterBuild).toBeNull(); expect(run.blastCharge).toBe(0);
    expect(run.scorePlacement(1, 'none', false).finalScore).toBe(100);
    expect(run.addLines(40)).toBe(true);
    expect(run.stats.chambersCleared).toBe(0);
    expect(run.finishPlacement()).toBeNull();
  });
});

describe('three starter builds', () => {
  it('requires a choice, grants exactly one free signature card, and keeps it out of sales and random offers', () => {
    const run = new RunManager(); run.openShop();
    expect(run.closeShop()).toBe(false);
    expect(run.buyCard(0)).toBe(false);
    expect(run.chooseStarter('__proto__')).toBe(false);
    expect(run.chooseStarter('combo')).toBe(true);
    expect(run.chooseStarter('demolition')).toBe(false);
    expect(run.coins).toBe(8);
    expect(run.relics.map(r => r.id)).toEqual(['safety_net']);
    expect(run.sellCard('safety_net')).toBe(false);
    expect(run.getRelicChoices(99)).toHaveLength(20);
    expect(run.getRelicChoices(99).every(r => r.price > 0)).toBe(true);
    expect(run.closeShop()).toBe(true);
  });
  it('rescues one combo gap per stage without generating points for an empty placement', () => {
    const run = start();
    run.scorePlacement(1, 'none', false);
    run.scorePlacement(1, 'none', false);
    const rescue = run.scorePlacement(0, 'none', false);
    expect(rescue.finalScore).toBe(0);
    expect(run.stats.currentCombo).toBe(2);
    expect(rescue.triggers).toContainEqual({ id: 'safety_net', text: 'Combo terselamatkan · 1× per stage' });
    expect(run.scorePlacement(1, 'none', false).finalScore).toBe(200);
    run.scorePlacement(0, 'none', false);
    expect(run.stats.currentCombo).toBe(0);
    run.advanceToNextStage(); expect(run.comboRescueUsed).toBe(false);
  });
  it('charges demolition with actual cleared lines, detonates settled cells once, and never grants fake lines', () => {
    const run = start('demolition'); const board = new Board();
    run.scorePlacement(0, 'full', false); expect(run.blastCharge).toBe(0);
    for (let i = 0; i < 3; i++) run.scorePlacement(2, 'none', false);
    expect(run.blastCharge).toBe(6);
    const before = run.stage.currentProgress;
    expect(run.detonateBlast(() => board.blast(4, 20))).toBe(0);
    expect(run.blastCharge).toBe(6);
    for (let y = 19; y <= 21; y++) for (let x = 3; x <= 5; x++) board.grid[y][x] = 'GARBAGE';
    board.grid[22][3] = 'T';
    expect(run.detonateBlast(() => board.blast(4, 20))).toBe(360);
    expect(run.stage.currentProgress).toBe(before + 360);
    expect(run.blastCharge).toBe(0);
    expect(board.grid[22][3]).toBe('T');
    expect(board.grid.flat().filter(Boolean)).toHaveLength(1);
    expect(run.stats.lines).toBe(0);
    expect(run.detonateBlast(() => board.blast(3, 22))).toBe(0);
    expect(board.blast(NaN, 0)).toBe(0);
    expect(board.blast(-1, 0)).toBe(0);
  });
  it('aims beneath the actual ghost bounds including a vertical I at either wall', () => {
    for (const [column, x] of [[0, -2], [9, 7]]) {
      const board = new Board();
      for (let y = 20; y < 24; y++) board.grid[y][column] = 'GARBAGE';
      const piece = createPiece('I'); piece.rotation = 1; piece.x = x;
      const target = board.getBlastTarget(piece);
      expect(target).toEqual({ x: column, y: 20 });
      expect(board.blast(target.x, target.y)).toBe(2);
    }
  });
  it('offers an optional stage contract, pays once, and resets the offer for the next stage', () => {
    const run = new RunManager(); run.openShop(); run.chooseStarter('gambler');
    expect(run.acceptContract()).toBe(true); expect(run.acceptContract()).toBe(false);
    run.closeShop();
    expect(run.acceptContract()).toBe(false);
    run.scorePlacement(1, 'none', false); run.scorePlacement(0, 'full', false);
    expect(run.contractProgress).toBe(0);
    for (let i = 0; i < 3; i++) run.scorePlacement(2, 'none', false);
    expect(run.contract).toBe('won'); expect(run.coins).toBe(12);
    const score = run.stage.currentProgress;
    const another = run.scorePlacement(2, 'none', false);
    expect(run.stage.currentProgress).toBe(score + another.finalScore);
    expect(run.coins).toBe(12);
    run.advanceToNextStage();
    expect(run.contract).toBe('off'); expect(run.contractProgress).toBe(0);
  });
  it('deducts a failed contract before income exactly once, without negative balances', () => {
    const run = new RunManager(); run.openShop(); run.chooseStarter('gambler'); run.acceptContract(); run.closeShop();
    run.coins = 2; run.addClearScore(run.stage.targetValue); run.finishPlacement();
    expect(run.settleStage()).toBe(true);
    expect(run.contract).toBe('lost'); expect(run.coins).toBe(6);
    expect(run.shopReceipt).toContain('Kontrak gagal');
    expect(run.settleStage()).toBe(false); expect(run.coins).toBe(6);
  });
  it('reports actual scoring and economy triggers without claiming inactive bonuses', () => {
    const run = start();
    for (const id of ['coin_press', 'abbots_chalice', 'amber_reliquary']) run.addRelic(ALL_RELICS.find(r => r.id === id)!);
    const first = run.scorePlacement(1, 'none', false);
    expect(first.triggers.map(t => t.id)).toEqual(['coin_press']);
    run.coins = 1;
    const next = run.scorePlacement(1, 'none', false);
    expect(next.triggers.map(t => t.id)).toEqual(['abbots_chalice', 'amber_reliquary', 'coin_press']);
    expect(next.finalScore).toBe(540);
  });
});
