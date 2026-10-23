import { afterEach, describe, expect, it, vi } from 'vitest';
import { RunManager } from '../src/roguelite/runManager';
import { InputHandler } from '../src/input/inputHandler';
import { createPiece, getPieceBlocks, isPieceColliding, tryRotatePiece } from '../src/core/piece';
import { Board } from '../src/core/board';
import { detectTSpin } from '../src/core/tspin';
import { SfxPlayer } from '../src/audio/sfxPlayer';
import type { GameSettings } from '../src/core/types';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const settings: GameSettings = { das: 100, arr: 0, dcd: 50, softDropMultiplier: 41,
  sfxVolume: .7, ttsMode: 'procedural', screenShake: true, ghostPiece: true, particles: true };
function inputFixture(cancelDas = true) {
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  const listeners = new Map<string, ((e: unknown) => void)[]>();
  vi.stubGlobal('window', { addEventListener: (type: string, fn: (e: unknown) => void) => listeners.set(type, [...listeners.get(type) ?? [], fn]) });
  vi.stubGlobal('navigator', { getGamepads: () => [] });
  const input = new InputHandler({ ...settings, cancelDas });
  const key = (type: string, code: string) => listeners.get(type)?.forEach(fn => fn({ code, target: null, preventDefault() {} }));
  const elapse = (ms: number) => { now += ms; };
  const advance = (ms: number) => { elapse(ms); input.update(); };
  return { input, key, advance, elapse };
}

describe('solo rules', () => {
  it('ends Blitz exactly once at two minutes and disables rogue progression and Fever', () => {
    const run = new RunManager(); run.resetRun('blitz');
    expect(run.tick(119999)).toBe(false);
    expect(run.tick(16)).toBe(true);
    expect(run.elapsedMs).toBe(120000);
    expect(run.tick(16)).toBe(false);
    expect(run.addLines(40)).toBe(false);
    expect(run.level).toBe(9);
    expect(run.registerPrismClear(4, 10)).toEqual({ multiplier: 1, activated: false });
    expect(run.openShop()).toBe(false);
    run.addLines(100); expect(run.level).toBe(15);
    expect(run.stats.chambersCleared).toBe(0);
  });
  it('runs Zen indefinitely and validates custom rules at the boundary', () => {
    const run = new RunManager(); run.resetRun('zen');
    expect(run.tick(3600001)).toBe(false);
    expect(run.addLines(10000)).toBe(false);
    run.resetRun('custom', { targetLines: NaN, timeLimitMs: Infinity, level: -2 });
    expect(run.rules).toEqual({ targetLines: 40, timeLimitMs: 0, level: 1 });
    run.resetRun('custom', { targetLines: 2, timeLimitMs: 60000, level: 8 });
    expect(run.level).toBe(8); expect(run.addLines(1)).toBe(false);
    expect(run.addLines(1)).toBe(true); expect(run.addLines(1)).toBe(false);
    run.resetRun(); expect(run.rules).toEqual({ targetLines: 2, timeLimitMs: 60000, level: 8 });
    run.resetRun('roguelite'); expect(run.rules.timeLimitMs).toBe(0);
    expect(run.tick(NaN)).toBe(false); expect(run.elapsedMs).toBe(0);
  });
  it('keeps records separate across all modes', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) });
    const run = new RunManager();
    for (const [i, mode] of (['sprint', 'blitz', 'zen', 'custom', 'roguelite'] as const).entries()) {
      run.resetRun(mode); expect(run.stats.highScore).toBe(0); run.addScore(100 + i);
    }
    for (const [i, mode] of (['sprint', 'blitz', 'zen', 'custom', 'roguelite'] as const).entries()) {
      run.resetRun(mode); expect(run.stats.highScore).toBe(100 + i);
    }
  });
});

describe('handling extensions', () => {
  it('starts DCD at manipulation time without counting time before it', () => {
    const { input, key, advance, elapse } = inputFixture();
    key('keydown', 'ArrowLeft');
    advance(100); input.consumeHorizontalShift();
    elapse(20); input.delayAutoShift();
    for (let tick = 0; tick < 6; tick++) input.update();
    advance(49); expect(input.consumeHorizontalShift()).toBe(0);
    advance(2); expect(input.consumeHorizontalShift()).toBe(-10);
  });
  it('DCD pauses charged ARR without losing DAS; a fresh tap remains immediate', () => {
    const { input, key, advance } = inputFixture(); key('keydown', 'ArrowLeft');
    input.consumeHorizontalShift(); advance(100); expect(input.consumeHorizontalShift()).toBe(-10);
    input.delayAutoShift(); advance(49); expect(input.consumeHorizontalShift()).toBe(0);
    advance(2); expect(input.consumeHorizontalShift()).toBe(-10);
    input.delayAutoShift(); key('keydown', 'ArrowRight'); expect(input.consumeHorizontalShift()).toBe(1);
    advance(50); expect(input.consumeHorizontalShift()).toBe(0);
  });
  it('supports direction-change DAS carry and held countdown actions', () => {
    const { input, key, advance } = inputFixture(false); key('keydown', 'ArrowLeft'); advance(100);
    input.consumeHorizontalShift(); key('keydown', 'ArrowRight'); input.consumeHorizontalShift();
    advance(1); expect(input.consumeHorizontalShift()).toBe(10);
    key('keydown', 'KeyC'); key('keydown', 'KeyZ'); input.clearActions();
    expect(input.initialActions()).toEqual({ hold: true, rotation: 'ccw' });
    key('keyup', 'KeyC'); key('keyup', 'KeyZ');
    expect(input.initialActions()).toEqual({ hold: false, rotation: null });
    input.reset(); advance(100); expect(input.consumeHorizontalShift()).toBe(0);
  });
  it('kicks 180 at the wall, rejects blocked rotations, and preserves the original piece', () => {
    const board = new Board(), piece = createPiece('T'); piece.rotation = 1; piece.x = -1; piece.y = 10;
    expect(isPieceColliding(piece, 0, 0, piece.rotation, board.isCellBlocked)).toBe(false);
    const result = tryRotatePiece(piece, '180', board.isCellBlocked);
    expect(result.success).toBe(true); expect(result.newPiece.x).toBe(0);
    expect(result.newPiece.lastRotateWas180).toBe(true); expect(piece.x).toBe(-1);
    expect(getPieceBlocks(result.newPiece).every(p => p.x >= 0)).toBe(true);
    expect(tryRotatePiece(piece, '180', () => true).success).toBe(false);
  });
  it('does not apply the fifth 90-degree kick spin promotion to a 180 kick', () => {
    const piece = createPiece('T'); piece.lastActionWasRotate = true; piece.lastKickIndex = 4;
    const blocked = (x: number, y: number) => y === 4 || (x === 3 && y === 2);
    expect(detectTSpin(piece, blocked)).toBe('full');
    piece.lastRotateWas180 = true; expect(detectTSpin(piece, blocked)).toBe('mini');
  });
});

describe('original arcade audio', () => {
  it('schedules finite envelopes, releases nodes, throttles taps, and obeys zero volume', () => {
    const oscillators: any[] = [];
    const param = () => ({ value: 0, setValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
    const node = () => ({ connect: vi.fn(), disconnect: vi.fn(), gain: param() });
    class Context {
      currentTime = 1; state = 'running'; destination = {};
      createGain = node;
      createDynamicsCompressor = () => ({ ...node(), threshold: param(), ratio: param() });
      createOscillator = () => { const osc = { ...node(), frequency: param(), start: vi.fn(), stop: vi.fn(), onended: null as any }; oscillators.push(osc); return osc; };
    }
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch); vi.stubGlobal('AudioContext', Context);
    vi.stubGlobal('document', { getElementById: () => null });
    const sfx = new SfxPlayer(); sfx.setPack('arcade'); sfx.init();
    sfx.playMove(); sfx.playMove(); expect(oscillators).toHaveLength(1);
    sfx.playRotate(); sfx.playHardDrop(); sfx.playLock(); sfx.playHold();
    for (let lines = 1; lines <= 4; lines++) sfx.playLineClear(lines);
    sfx.playTSpin(); sfx.playCombo(5); sfx.playB2b(); sfx.playPerfectClear(); sfx.playCountdown(0); sfx.playGameOver();
    expect(fetch).not.toHaveBeenCalled();
    for (const oscillator of oscillators) {
      expect(oscillator.start).toHaveBeenCalledOnce(); expect(oscillator.stop).toHaveBeenCalledOnce();
      expect(oscillator.stop.mock.calls[0][0]).toBeGreaterThan(oscillator.start.mock.calls[0][0]);
      for (const [hz, at] of oscillator.frequency.exponentialRampToValueAtTime.mock.calls) {
        expect(hz).toBeGreaterThan(0); expect(Number.isFinite(at)).toBe(true);
      }
      oscillator.onended(); expect(oscillator.disconnect).toHaveBeenCalledOnce();
    }
    const count = oscillators.length; sfx.setSfxVolume(0); sfx.playTSpin(); expect(oscillators).toHaveLength(count);
  });
});
