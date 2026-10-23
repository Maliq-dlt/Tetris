import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { InputHandler } from '../src/input/inputHandler';
import { RunManager } from '../src/roguelite/runManager';
import { BagRandomizer } from '../src/core/bag';
import { Board } from '../src/core/board';
import { createPiece } from '../src/core/piece';
import { ALL_RELICS } from '../src/roguelite/relics';
import { GameSettings } from '../src/core/types';
import { formatTime } from '../src/ui/uiManager';

const settings: GameSettings = { das: 100, arr: 0, softDropMultiplier: 40, sfxVolume: .7,
  ttsMode: 'procedural', screenShake: true, ghostPiece: true, particles: true };

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function inputFixture(arr = 0) {
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  const listeners = new Map<string, ((event: unknown) => void)[]>();
  vi.stubGlobal('window', { addEventListener: (type: string, fn: (event: unknown) => void) => {
    listeners.set(type, [...(listeners.get(type) ?? []), fn]);
  }});
  vi.stubGlobal('navigator', { getGamepads: () => [] });
  const input = new InputHandler({ ...settings, arr });
  const key = (type: string, code: string, repeat = false) => {
    for (const fn of listeners.get(type) ?? []) fn({ code, repeat, target: null, preventDefault() {} });
  };
  const advance = (ms: number) => { now += ms; input.update(); };
  return { input, key, advance };
}

describe('fast handling regressions', () => {
  it('does not charge a fresh tap with catch-up ticks from before the key press', () => {
    const { input, key, advance } = inputFixture();
    advance(100); // Frame time elapsed before this new press.
    key('keydown', 'ArrowRight');
    expect(input.consumeHorizontalShift()).toBe(1);
    for (let tick = 0; tick < 6; tick++) input.update();
    expect(input.consumeHorizontalShift()).toBe(0);
    advance(30);
    expect(input.consumeHorizontalShift()).toBe(0);
    key('keyup', 'ArrowRight');
    advance(100);
    expect(input.consumeHorizontalShift()).toBe(0);
  });
  it('resets the hold delay for rapid direction changes and repeated taps', () => {
    const { input, key, advance } = inputFixture();
    let previous = 'ArrowLeft';
    key('keydown', previous);
    input.consumeHorizontalShift();
    advance(100);
    expect(input.consumeHorizontalShift()).toBe(-10);
    for (let i = 0; i < 12; i++) {
      const code = i % 2 === 0 ? 'ArrowRight' : 'ArrowLeft';
      const direction = i % 2 === 0 ? 1 : -1;
      key('keydown', code);
      key('keyup', previous);
      expect(input.consumeHorizontalShift()).toBe(direction);
      advance(20);
      for (let tick = 0; tick < 6; tick++) input.update();
      expect(input.consumeHorizontalShift()).toBe(0);
      previous = code;
    }
    key('keyup', previous);
    for (let i = 0; i < 6; i++) {
      key('keydown', 'ArrowRight');
      expect(input.consumeHorizontalShift()).toBe(1);
      advance(20);
      expect(input.consumeHorizontalShift()).toBe(0);
      key('keyup', 'ArrowRight');
    }
  });
  it('ignores OS repeat and moves to the wall at ARR zero after DAS', () => {
    const { input, key, advance } = inputFixture();
    key('keydown', 'ArrowRight');
    expect(input.consumeHorizontalShift()).toBe(1);
    advance(60);
    expect(input.consumeHorizontalShift()).toBe(0);
    key('keydown', 'ArrowRight', true);
    advance(40);
    expect(input.consumeHorizontalShift()).toBe(10);
    key('keyup', 'ArrowRight');
    advance(100);
    expect(input.consumeHorizontalShift()).toBe(0);
  });
  it('preserves multiple ARR repeats in one update and resets queued motion', () => {
    const { input, key, advance } = inputFixture(10);
    key('keydown', 'ArrowLeft');
    expect(input.consumeHorizontalShift()).toBe(-1);
    advance(150);
    expect(input.consumeHorizontalShift()).toBe(-6);
    input.reset();
    advance(150);
    expect(input.consumeHorizontalShift()).toBe(0);
  });
  it('resumes the opposite held direction when the newest direction is released', () => {
    const { input, key } = inputFixture();
    key('keydown', 'ArrowLeft');
    key('keydown', 'ArrowRight');
    expect(input.consumeHorizontalShift()).toBe(1);
    key('keyup', 'ArrowRight');
    expect(input.consumeHorizontalShift()).toBe(-1);
  });
  it('starts gamepad DAS when the press is detected, excluding the previous frame', () => {
    const { input, advance } = inputFixture();
    const pad = { buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 15 })) };
    vi.stubGlobal('navigator', { getGamepads: () => [pad] });
    advance(100);
    expect(input.consumeHorizontalShift()).toBe(1);
    for (let tick = 0; tick < 6; tick++) input.update();
    advance(99); expect(input.consumeHorizontalShift()).toBe(0);
    advance(1); expect(input.consumeHorizontalShift()).toBe(10);
    vi.stubGlobal('navigator', { getGamepads: () => [] });
    advance(100); expect(input.consumeHorizontalShift()).toBe(0);
  });
  it('reads gamepad soft drop and clears it after disconnect', () => {
    const pad = { buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 13 })) };
    const { input, advance } = inputFixture();
    vi.stubGlobal('navigator', { getGamepads: () => [pad] });
    advance(16);
    expect(input.isSoftDropActive()).toBe(true);
    vi.stubGlobal('navigator', { getGamepads: () => [] });
    advance(16);
    expect(input.isSoftDropActive()).toBe(false);
  });
});

describe('Sprint 40 lifecycle using real board clears', () => {
  it('finishes only at 40 lines, persists the fastest time, and keeps roguelite separate', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value) });
    const run = new RunManager();
    run.resetRun('sprint');
    expect(run.stage.modifier.id).toBe('none');
    expect(run.getPeriodicGarbageInterval()).toBeNull();
    expect(run.getExcludedPieces()).toEqual([]);
    expect(run.registerPrismClear(4, 8).multiplier).toBe(1);
    expect(run.finishSprint()).toBe(false);
    const board = new Board();
    for (let turn = 0; turn < 10; turn++) {
      for (let y = 20; y < 24; y++) for (let x = 0; x < 9; x++) board.grid[y][x] = 'J';
      const piece = createPiece('I');
      piece.rotation = 1; piece.x = 7; piece.y = 20;
      expect(board.lockPiece(piece).topOut).toBe(false);
      const rows = board.clearFullLines();
      expect(rows).toHaveLength(4);
      expect(run.addLines(rows.length)).toBe(turn === 9);
      expect(board.isPerfectClear()).toBe(true);
    }
    run.elapsedMs = 60001;
    expect(run.finishSprint()).toBe(true);
    expect(run.stats.chambersCleared).toBe(0);
    run.resetRun();
    expect(run.bestSprintMs).toBe(60001);
    run.stats.lines = 40; run.elapsedMs = 70000; run.finishSprint();
    expect(run.bestSprintMs).toBe(60001);
    run.elapsedMs = 59000; run.finishSprint();
    expect(run.bestSprintMs).toBe(59000);
    run.resetRun('roguelite');
    expect([run.elapsedMs, run.pieces, run.prismCharge]).toEqual([0, 0, 0]);
    expect(run.stage.targetValue).toBe(10);
    expect(run.addLines(10)).toBe(true);
    expect(run.stats.chambersCleared).toBe(1);
    expect(formatTime(60001)).toBe('1:00.001');
  });
  it('still finishes when browser storage is unavailable', () => {
    const run = new RunManager();
    run.resetRun('sprint');
    run.stats.lines = 41; run.elapsedMs = 55123;
    expect(run.finishSprint()).toBe(true);
    expect(run.bestSprintMs).toBe(55123);
  });
});

describe('replacement SFX pack', () => {
  it('ships the 14 original OGG files with matching hashes', () => {
    const root = new URL('../public/audio/sfx/', import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
    expect(Object.keys(manifest.clips)).toHaveLength(14);
    for (const clip of Object.values(manifest.clips) as { file: string; sha256: string; seconds: number }[]) {
      const data = readFileSync(new URL(clip.file, root));
      expect(data.toString('ascii', 0, 4)).toBe('OggS');
      expect(createHash('sha256').update(data).digest('hex')).toBe(clip.sha256);
      expect(clip.seconds).toBeGreaterThan(0);
    }
  });
});


describe('roguelite market and build lifecycle', () => {
  const card = (id: string) => ALL_RELICS.find(r => r.id === id)!;
  it('buys, sells, rerolls and rejects duplicate, unaffordable or invalid transactions', () => {
    const run = new RunManager();
    expect(run.buyCard(0)).toBe(false);
    expect(run.openShop()).toBe(true);
    expect(run.openShop()).toBe(false);
    expect(run.shopOffers.some(r => r && r.price <= run.coins)).toBe(true);
    run.shopOffers = [card('coin_press'), card('heavy_lead_cane'), card('coin_press')];
    expect(run.buyCard(NaN)).toBe(false);
    expect(run.buyCard(-1)).toBe(false);
    expect(run.buyCard(1)).toBe(false);
    expect(run.coins).toBe(8);
    expect(run.buyCard(0)).toBe(true);
    expect(run.coins).toBe(3);
    expect(run.buyCard(0)).toBe(false);
    run.coins = 10;
    expect(run.buyCard(2)).toBe(false);
    expect(run.rerollShop()).toBe(true);
    expect(run.coins).toBe(8);
    expect(run.rerollCost).toBe(3);
    expect(run.shopOffers.every(r => r?.id !== 'coin_press')).toBe(true);
    expect(run.sellCard('coin_press')).toBe(true);
    expect(run.coins).toBe(10);
    expect(run.sellCard('coin_press')).toBe(false);
    expect(run.stats.relicsCollected).toHaveLength(0);
    run.closeShop();
    expect(run.sellCard('payday')).toBe(false);
    expect(run.rerollShop()).toBe(false);
  });
  it('plays real board clears, settles only once, and carries the build into the next market', () => {
    const run = new RunManager();
    run.openShop(); run.shopOffers = [card('coin_press')]; run.buyCard(0); run.closeShop();
    const board = new Board();
    for (let turn = 0; turn < 3; turn++) {
      for (let y = 20; y < 24; y++) for (let x = 0; x < 9; x++) board.grid[y][x] = 'J';
      const piece = createPiece('I'); piece.rotation = 1; piece.x = 7; piece.y = 20;
      board.lockPiece(piece);
      const lines = board.clearFullLines().length;
      run.awardClearCoins(lines, turn + 1);
      run.addScore(4000);
      expect(run.addLines(lines)).toBe(turn === 2);
    }
    expect(run.coins).toBe(6);
    expect(run.settleStage()).toBe(true);
    // $6 stage + $6 score + $1 interest, on top of $6 wallet.
    expect(run.coins).toBe(19);
    expect(run.settleStage()).toBe(false);
    run.advanceToNextStage();
    expect(run.openShop()).toBe(true);
    expect(run.hasRelic('coin_press')).toBe(true);
    expect(run.shopOffers.every(r => r?.id !== 'coin_press')).toBe(true);
    expect(run.stage.currentProgress).toBe(0);
  });
  it('enforces six slots and applies economy and risk/reward synergies', () => {
    const run = new RunManager();
    for (const id of ['coin_press', 'chain_wallet', 'compound_interest', 'payday', 'amber_reliquary', 'sunlit_vitrail']) run.addRelic(card(id));
    expect(run.awardClearCoins(1, 2)).toBe(1);
    expect(run.awardClearCoins(2, 3)).toBe(3);
    expect(run.awardClearCoins(0, 9)).toBe(0);
    run.coins = 2;
    expect(run.getEffectiveScoreMultiplier()).toBeCloseTo(3.8);
    run.coins = 50;
    expect(run.getEffectiveScoreMultiplier()).toBeCloseTo(1.9);
    run.openShop(); run.shopOffers = [card('prophets_window')];
    expect(run.buyCard(0)).toBe(false);
    run.addRelic(card('prophets_window'));
    expect(run.relics).toHaveLength(6);
    run.addLines(10); run.settleStage();
    expect(run.coins).toBe(69); // $6 base + $10 capped interest + $3 Payday.
    run.resetRun('sprint');
    expect(run.openShop()).toBe(false);
    expect(run.coins).toBe(0);
    expect(run.awardClearCoins(4, 10)).toBe(0);
  });
  it('charges repair once, removes actual bottom rows without granting clears, and blocks it outside shop', () => {
    const run = new RunManager();
    const board = new Board(); board.grid[23][0] = 'T'; board.grid[19][3] = 'J';
    expect(run.buyRepair(true)).toBe(false);
    run.openShop();
    expect(run.buyRepair(false)).toBe(false);
    expect(run.buyRepair(true)).toBe(true);
    board.clearBottomRows(4);
    expect(board.grid[23][3]).toBe('J');
    expect(board.grid.flat().filter(Boolean)).toHaveLength(1);
    expect(run.buyRepair(true)).toBe(false);
    expect(run.stats.lines).toBe(0);
    expect(run.coins).toBe(3);
  });
  it('applies the timing downside of control cards', () => {
    const run = new RunManager(); run.addRelic(card('rose_medallion'));
    const { input, key, advance } = inputFixture(); input.dasModifier = run.getEffectiveDasModifier();
    key('keydown', 'ArrowRight'); input.consumeHorizontalShift();
    advance(100); expect(input.consumeHorizontalShift()).toBe(0);
    advance(35); expect(input.consumeHorizontalShift()).toBe(10);
    expect(run.getEffectiveLockDelay()).toBe(750);
  });
});


describe('card-driven queue and survival regressions', () => {
  it('shows the exact upcoming pieces including every fifth guaranteed T', () => {
    const bag = new BagRandomizer();
    bag.setGuaranteedRule({ type: 'T', interval: 5 });
    for (let turn = 1; turn <= 35; turn++) {
      const preview = bag.peek(7);
      const actual = bag.next();
      expect(actual).toBe(preview[0]);
      if (turn % 5 === 0) expect(actual).toBe('T');
      expect(bag.peek(6)).toEqual(preview.slice(1));
    }
  });
  it('applies and removes exclusions immediately at a stage boundary', () => {
    const bag = new BagRandomizer();
    bag.peek(14);
    bag.setExcludedPieces(['I']);
    expect(bag.peek(14)).not.toContain('I');
    for (let i = 0; i < 25; i++) expect(bag.next()).not.toBe('I');
    bag.setExcludedPieces([]);
    expect(bag.peek(14)).toContain('I');
  });
  it('clears hidden spawn cells on revival and keeps late-run gravity finite', () => {
    const board = new Board(); board.grid[2][4] = 'T'; board.grid[10][4] = 'J'; board.grid[11][4] = 'I';
    board.clearTopStack(7);
    expect(board.grid[2][4]).toBeNull();
    expect(board.grid[10][4]).toBeNull();
    expect(board.grid[11][4]).toBe('I');
    const run = new RunManager();
    expect(run.getEffectiveGravityInterval(999)).toBe(80);
  });
});
