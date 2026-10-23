import { describe, it, expect } from 'vitest';
import { Board } from './board';
import { createPiece, tryRotatePiece } from './piece';
import { detectTSpin } from './tspin';
import { calculateClearScore } from './scoring';
import { BagRandomizer } from './bag';
import { RunManager } from '../roguelite/runManager';

describe('Board & Collision', () => {
  it('correctly creates empty grid and identifies boundaries', () => {
    const board = new Board();
    expect(board.isCellBlocked(-1, 10)).toBe(true);
    expect(board.isCellBlocked(10, 10)).toBe(true);
    expect(board.isCellBlocked(5, 24)).toBe(true);
    expect(board.isCellBlocked(5, 10)).toBe(false);
  });

  it('locks a piece and clears full lines', () => {
    const board = new Board();
    // Fill row 23 except column 3, 4, 5, 6
    for (let c = 0; c < 10; c++) {
      if (c < 3 || c > 6) {
        board.grid[23][c] = 'GARBAGE';
      }
    }

    // Place an I piece at (3, 23) in rotation 0
    const piece = createPiece('I');
    piece.x = 3;
    piece.y = 22; // In rotation 0, row 1 of 4x4 matrix is at 22 + 1 = 23
    board.lockPiece(piece);

    const cleared = board.clearFullLines();
    expect(cleared.length).toBe(1);
    expect(cleared[0]).toBe(23);
    expect(board.grid[23].every(c => c === null)).toBe(true);
  });
});

describe('SRS Wall Kick Rotation', () => {
  it('rotates T-piece CW and applies wall kicks against wall', () => {
    const board = new Board();
    const piece = createPiece('T');
    piece.x = 0; // right up against left wall
    piece.y = 10;

    // Rotate CCW (0 -> 3): T points LEFT against wall (x=0)
    const resCCW = tryRotatePiece(piece, 'ccw', board.isCellBlocked);
    expect(resCCW.success).toBe(true);
    expect(resCCW.newPiece.rotation).toBe(3);

    // Now rotating CW back (3 -> 0)
    const resCW = tryRotatePiece(resCCW.newPiece, 'cw', board.isCellBlocked);
    expect(resCW.success).toBe(true);
    expect(resCW.newPiece.rotation).toBe(0);
  });
});

describe('T-Spin Detection', () => {
  it('detects Full T-Spin via 3-corner rule', () => {
    const board = new Board();
    const piece = createPiece('T');
    piece.x = 4;
    piece.y = 15;
    piece.rotation = 0; // points up: front corners are TL (4, 15) and TR (6, 15)
    piece.lastActionWasRotate = true;

    // Fill 3 corners: TL, TR, and BL
    board.grid[15][4] = 'GARBAGE'; // TL (front)
    board.grid[15][6] = 'GARBAGE'; // TR (front)
    board.grid[17][4] = 'GARBAGE'; // BL (back)

    const result = detectTSpin(piece, board.isCellBlocked);
    expect(result).toBe('full');
  });

  it('detects T-Spin Mini when only 1 front corner is blocked', () => {
    const board = new Board();
    const piece = createPiece('T');
    piece.x = 4;
    piece.y = 15;
    piece.rotation = 0; // points up
    piece.lastActionWasRotate = true;
    piece.lastKickIndex = 0;

    // Fill 1 front corner (TL) and 2 back corners (BL, BR)
    board.grid[15][4] = 'GARBAGE'; // TL (front)
    board.grid[17][4] = 'GARBAGE'; // BL (back)
    board.grid[17][6] = 'GARBAGE'; // BR (back)

    const result = detectTSpin(piece, board.isCellBlocked);
    expect(result).toBe('mini');
  });
});

describe('Guideline Scoring & B2B', () => {
  it('calculates Single, Tetris and B2B bonuses correctly', () => {
    const single = calculateClearScore(1, 'none', 1, false, 0, false);
    expect(single.finalScore).toBe(100);

    const tetris = calculateClearScore(4, 'none', 1, false, 0, false);
    expect(tetris.finalScore).toBe(800);

    const b2bTetris = calculateClearScore(4, 'none', 1, true, 0, false);
    expect(b2bTetris.finalScore).toBe(1200); // 800 * 1.5 = 1200
  });
});

describe('7-Bag Randomizer', () => {
  it('dispenses all 7 unique pieces per 7 pulls', () => {
    const bag = new BagRandomizer();
    const pulled = new Set<string>();
    for (let i = 0; i < 7; i++) {
      pulled.add(bag.next());
    }
    expect(pulled.size).toBe(7);
  });

  it('correctly excludes pieces when modifier is active', () => {
    const bag = new BagRandomizer();
    bag.setExcludedPieces(['I']);
    bag.reset();

    for (let i = 0; i < 28; i++) {
      const piece = bag.next();
      expect(piece).not.toBe('I');
    }
  });
});

describe('Roguelite Run Manager', () => {
  it('synthesizes relic modifiers', () => {
    const run = new RunManager();
    expect(run.getEffectiveHoldSlots()).toBe(1);

    // Consecrate Cathedral Bell (+1 hold slot, -75ms lock delay)
    run.addRelic({
      id: 'cathedral_bell',
      name: 'Cathedral Bell',
      price: 7,
      rarity: 'cursed',
      subtitle: '',
      icon: '',
      buffDescription: '',
      effects: { holdSlotBonus: 1, lockDelayModifier: -75 },
      isCurseTradeoff: true
    });

    expect(run.getEffectiveHoldSlots()).toBe(2);
    expect(run.getEffectiveLockDelay()).toBe(425);
  });
});
