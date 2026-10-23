/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Offscreen Sprite Cache for Stained Glass Minos & Lead Cames
 * Zero per-frame allocations & high-DPI crystal crispness
 */

import { STAINED_GLASS_COLORS } from '../core/constants';
import { TetrominoType } from '../core/types';

export type SpriteKey = TetrominoType | 'GARBAGE' | 'LEAD' | 'GHOST';

export class SpriteCache {
  private cache: Map<string, HTMLCanvasElement> = new Map();
  private tileSize = 36;
  private dpr = 1;

  public init(tileSize: number, dpr: number): void {
    this.tileSize = tileSize;
    this.dpr = dpr;
    this.cache.clear();
    this.renderAllSprites();
  }

  private renderAllSprites(): void {
    const keys: (TetrominoType | 'GARBAGE' | 'LEAD')[] = [
      'I', 'J', 'L', 'O', 'S', 'T', 'Z', 'GARBAGE', 'LEAD'
    ];

    keys.forEach(k => {
      this.cache.set(k, this.createGlassMinoCanvas(k, false));
      // Ghost version
      this.cache.set(`${k}_GHOST`, this.createGlassMinoCanvas(k, true));
    });

    // Generic ghost
    this.cache.set('GHOST', this.createGenericGhostCanvas());
  }

  private createGlassMinoCanvas(key: TetrominoType | 'GARBAGE' | 'LEAD', isGhost: boolean): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const pixelSize = Math.round(this.tileSize * this.dpr);
    canvas.width = pixelSize;
    canvas.height = pixelSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.scale(this.dpr, this.dpr);
    const size = this.tileSize;
    const color = STAINED_GLASS_COLORS[key];

    const inset = 1;
    const edge = size - inset * 2;
    const radius = 1;
    ctx.beginPath();
    ctx.roundRect(inset, inset, edge, edge, radius);
    if (isGhost) {
      ctx.fillStyle = color.base;
      ctx.globalAlpha = 0.09;
      ctx.fill();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = color.light;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      return canvas;
    }
    ctx.fillStyle = color.shadow;
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(inset, inset, edge, edge - 3, radius);
    ctx.fillStyle = color.base;
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(inset + 2, inset + 2, edge - 4, Math.max(2, size * 0.12), 1);
    ctx.fillStyle = color.light;
    ctx.fill();

    return canvas;
  }

  private createGenericGhostCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const pixelSize = Math.round(this.tileSize * this.dpr);
    canvas.width = pixelSize;
    canvas.height = pixelSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.scale(this.dpr, this.dpr);
    const size = this.tileSize;

    ctx.strokeStyle = 'rgba(212, 163, 115, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(2, 2, size - 4, size - 4);

    return canvas;
  }

  public getSprite(key: string): HTMLCanvasElement | undefined {
    return this.cache.get(key);
  }
}
