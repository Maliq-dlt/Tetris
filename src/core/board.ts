/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Board Logic, Collision, Line Clears & Garbage
 */

import { ActivePiece, TetrominoType } from './types';
import { BOARD_HEIGHT, BOARD_WIDTH, VISIBLE_START_ROW } from './constants';
import { getPieceBlocks } from './piece';

export type CellValue = TetrominoType | 'GARBAGE' | 'LEAD' | null;

export class Board {
  public grid: CellValue[][];

  constructor() {
    this.grid = this.createEmptyGrid();
  }

  public reset(): void {
    this.grid = this.createEmptyGrid();
  }

  private createEmptyGrid(): CellValue[][] {
    const grid: CellValue[][] = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      grid.push(new Array(BOARD_WIDTH).fill(null));
    }
    return grid;
  }

  public isCellBlocked = (x: number, y: number): boolean => {
    // Wall and floor collision
    if (x < 0 || x >= BOARD_WIDTH) return true;
    if (y >= BOARD_HEIGHT) return true;
    // Buffer rows above 0 are valid space for pieces to spawn and rotate
    if (y < 0) return false;

    return this.grid[y][x] !== null;
  };

  /**
   * Locks the active piece into the board grid
   */
  public lockPiece(piece: ActivePiece): { topOut: boolean } {
    const blocks = getPieceBlocks(piece);
    let topOut = false;

    for (let i = 0; i < blocks.length; i++) {
      const pt = blocks[i];
      if (pt.y < VISIBLE_START_ROW) {
        topOut = true;
      }
      if (pt.y >= 0 && pt.y < BOARD_HEIGHT && pt.x >= 0 && pt.x < BOARD_WIDTH) {
        this.grid[pt.y][pt.x] = piece.type;
      }
    }

    return { topOut };
  }

  /**
   * Checks for full rows, removes them, and drops rows above.
   * Returns list of cleared row indices (0-23).
   */
  public clearFullLines(): number[] {
    const clearedIndices: number[] = [];

    for (let r = BOARD_HEIGHT - 1; r >= 0; r--) {
      let isFull = true;
      for (let c = 0; c < BOARD_WIDTH; c++) {
        if (this.grid[r][c] === null) {
          isFull = false;
          break;
        }
      }

      if (isFull) {
        clearedIndices.push(r);
      }
    }

    if (clearedIndices.length > 0) {
      // Remove cleared rows and push new empty rows on top
      this.grid = this.grid.filter((_, idx) => !clearedIndices.includes(idx));
      while (this.grid.length < BOARD_HEIGHT) {
        this.grid.unshift(new Array(BOARD_WIDTH).fill(null));
      }
    }

    return clearedIndices;
  }

  /**
   * Check if the entire board is empty (Perfect Clear)
   */
  public isPerfectClear(): boolean {
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        if (this.grid[r][c] !== null) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Inserts garbage rows from the bottom with a randomized hole
   */
  public addGarbageLines(count: number): boolean {
    let topOut = false;
    const hole = Math.floor(Math.random() * BOARD_WIDTH);

    for (let i = 0; i < count; i++) {
      // Check if top visible row has blocks that will be pushed off
      for (let c = 0; c < BOARD_WIDTH; c++) {
        if (this.grid[VISIBLE_START_ROW][c] !== null) {
          topOut = true;
        }
      }

      // Shift up
      this.grid.shift();
      const newRow: CellValue[] = new Array(BOARD_WIDTH).fill('GARBAGE');
      newRow[hole] = null;
      this.grid.push(newRow);
    }

    return topOut;
  }

  /**
   * Add fixed lead obstacles (for stage debuff "Lead Seal")
   */
  public applyLeadSeal(): void {
    // Fill bottom 3 rows of col 0 and col 9 with lead blocks
    for (let r = BOARD_HEIGHT - 3; r < BOARD_HEIGHT; r++) {
      this.grid[r][0] = 'LEAD';
      this.grid[r][BOARD_WIDTH - 1] = 'LEAD';
    }
  }

  /**
   * Clears the bottom row if it has 8 or more blocks (Relic: Heavy Lead Cane)
   */
  public clearBottomRowIfAlmostFull(): boolean {
    const bottomRow = this.grid[BOARD_HEIGHT - 1];
    let filledCount = 0;
    for (let c = 0; c < BOARD_WIDTH; c++) {
      if (bottomRow[c] !== null) filledCount++;
    }

    if (filledCount >= 8) {
      this.grid.pop();
      this.grid.unshift(new Array(BOARD_WIDTH).fill(null));
      return true;
    }
    return false;
  }

  /**
   * Removes top N rows of the stack (for Second Chance relic)
   */
  public clearBottomRows(count: number): void {
    const rows = Math.max(0, Math.min(BOARD_HEIGHT, Math.floor(count)));
    this.grid.splice(BOARD_HEIGHT - rows, rows);
    while (this.grid.length < BOARD_HEIGHT) this.grid.unshift(new Array(BOARD_WIDTH).fill(null));
  }

  public clearTopStack(rowsToClear = 6): void {
    for (let r = 0; r < Math.min(BOARD_HEIGHT, VISIBLE_START_ROW + rowsToClear); r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        this.grid[r][c] = null;
      }
    }
  }

  /**
   * Get highest filled row (used by relics or gravity scaling)
   */
  public getStackHeight(): number {
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        if (this.grid[r][c] !== null) {
          return BOARD_HEIGHT - r;
        }
      }
    }
    return 0;
  }
}
