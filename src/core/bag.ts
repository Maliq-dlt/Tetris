/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * 7-Bag Randomizer with Relic Modifiers
 */

import { TetrominoType } from './types';

const ALL_PIECES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

export class BagRandomizer {
  private bag: TetrominoType[] = [];
  private queue: TetrominoType[] = [];
  private pieceCount = 0;
  private excludedPieces: Set<TetrominoType> = new Set();
  private guaranteedPieceRule: { type: TetrominoType; interval: number } | null = null;

  constructor() {
    this.refillQueue(14);
  }

  public setExcludedPieces(types: TetrominoType[]): void {
    const changed = types.length !== this.excludedPieces.size || types.some(type => !this.excludedPieces.has(type));
    this.excludedPieces = new Set(types);
    if (changed) this.reset();
  }

  public setGuaranteedRule(rule: { type: TetrominoType; interval: number } | null): void {
    const changed = rule?.type !== this.guaranteedPieceRule?.type || rule?.interval !== this.guaranteedPieceRule?.interval;
    this.guaranteedPieceRule = rule;
    if (changed) this.reset();
  }

  public reset(): void {
    this.bag = [];
    this.queue = [];
    this.pieceCount = 0;
    this.refillQueue(14);
  }

  private generateShuffledBag(): TetrominoType[] {
    const available = ALL_PIECES.filter(p => !this.excludedPieces.has(p));
    if (available.length === 0) throw new Error('At least one tetromino must remain in the bag.');
    // Fisher-Yates shuffle
    const shuffled = [...available];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private refillQueue(minSize: number): void {
    while (this.queue.length < minSize) {
      const position = this.pieceCount + this.queue.length + 1;
      if (this.guaranteedPieceRule && position % this.guaranteedPieceRule.interval === 0) {
        this.queue.push(this.guaranteedPieceRule.type);
        continue;
      }
      if (this.bag.length === 0) {
        this.bag = this.generateShuffledBag();
      }
      const nextPiece = this.bag.pop();
      if (nextPiece) {
        this.queue.push(nextPiece);
      }
    }
  }

  public next(): TetrominoType {
    this.refillQueue(7);
    this.pieceCount++;
    return this.queue.shift()!;
  }

  public peek(count: number): TetrominoType[] {
    this.refillQueue(count + 2);
    return this.queue.slice(0, count);
  }
}
