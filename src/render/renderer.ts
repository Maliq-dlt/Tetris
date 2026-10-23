/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Master Canvas Renderer
 * Decoupled from logic tick, DPR scaling, Stained Glass visuals
 */

import { BOARD_HEIGHT, BOARD_WIDTH, STAINED_GLASS_COLORS, VISIBLE_ROWS, VISIBLE_START_ROW } from '../core/constants';
import { ActivePiece, TetrominoType } from '../core/types';
import { Board } from '../core/board';
import { calculateGhostY, getPieceBlocks } from '../core/piece';
import { SpriteCache } from './spriteCache';
import { ParticlePool } from './particles';
import { Camera } from './camera';

export class Renderer {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public spriteCache: SpriteCache;
  public particles: ParticlePool;
  public camera: Camera;

  private readonly spawnRows = 2;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private tileSize = 36;
  private visualX = 0;
  private visualY = 0;
  private visualType: TetrominoType | null = null;
  private frameSeconds = 1 / 60;
  private dpr = 1;
  private boardPixelWidth = 360;
  private boardPixelHeight = 720;

  private lockFlashes: { x: number; y: number; alpha: number }[] = [];
  private dropTrails: { x: number; top: number; bottom: number; alpha: number; color: string }[] = [];

  public clearEffects(): void {
    this.lockFlashes = [];
    this.dropTrails = [];
    this.lineClearFlashRows = [];
    this.visualType = null;
    this.particles = new ParticlePool(250);
    this.camera = new Camera();
  }

  public triggerLockEffect(piece: ActivePiece): void {
    if (this.reducedMotion) return;
    for (const pt of getPieceBlocks(piece)) this.lockFlashes.push({ ...pt, alpha: .8 });
  }

  // Visual effects
  public screenShake = true;
  public showParticles = true;
  private lineClearFlashRows: { row: number; alpha: number }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.spriteCache = new SpriteCache();
    this.particles = new ParticlePool(250);
    this.camera = new Camera();

    this.resize();
  }

  public resize(): void {
    const sideSpace = window.innerWidth >= 700 ? 380 : 170;
    this.tileSize = Math.max(14, Math.min(34, Math.floor((window.innerHeight - 200) / (VISIBLE_ROWS + this.spawnRows)), Math.floor((window.innerWidth - sideSpace) / BOARD_WIDTH)));
    this.dpr = window.devicePixelRatio || 1;
    this.boardPixelWidth = BOARD_WIDTH * this.tileSize;
    this.boardPixelHeight = (VISIBLE_ROWS + this.spawnRows) * this.tileSize;
    this.canvas.closest<HTMLElement>('.main-layout')?.style.setProperty('--spawn-space', `${this.spawnRows * this.tileSize}px`);
    this.canvas.closest<HTMLElement>('.main-layout')?.style.setProperty('--board-width', `${this.boardPixelWidth}px`);

    this.canvas.width = Math.round(this.boardPixelWidth * this.dpr);
    this.canvas.height = Math.round(this.boardPixelHeight * this.dpr);
    this.canvas.style.width = `${this.boardPixelWidth}px`;
    this.canvas.style.height = `${this.boardPixelHeight}px`;

    this.spriteCache.init(this.tileSize, this.dpr);
  }

  public triggerLineClearEffect(clearedRowIndices: number[]): void {
    for (const r of clearedRowIndices) {
      if (r >= VISIBLE_START_ROW) {
        const visRow = r - VISIBLE_START_ROW;
        this.lineClearFlashRows.push({ row: visRow, alpha: 1.0 });

        // Spawn shattered glass particles
        this.particles.spawnLineClearShatter(
          0,
          (visRow + this.spawnRows) * this.tileSize,
          this.boardPixelWidth,
          this.tileSize,
          '#ffd8a8'
        );
      }
    }
    this.camera.addTrauma(clearedRowIndices.length >= 4 ? 0.22 : 0.1);
  }

  public triggerHardDropEffect(piece: ActivePiece, startY = piece.y): void {
    const blocks = getPieceBlocks(piece);
    if (!this.reducedMotion && startY < piece.y) {
      const columns = new Map<number, number>();
      for (const pt of blocks) columns.set(pt.x, Math.min(columns.get(pt.x) ?? Infinity, pt.y));
      for (const [x, y] of columns) this.dropTrails.push({ x, top: y - (piece.y - startY), bottom: y + 1, alpha: .65, color: STAINED_GLASS_COLORS[piece.type].light });
    }
    for (const pt of blocks) {
      if (pt.y >= VISIBLE_START_ROW) {
        const px = pt.x * this.tileSize + this.tileSize / 2;
        const py = (pt.y - VISIBLE_START_ROW + this.spawnRows + 1) * this.tileSize;
        this.particles.spawnImpactDust(px, py, STAINED_GLASS_COLORS[piece.type].light);
      }
    }
    this.camera.addTrauma(0.12);
  }

  public updateEffects(dtSeconds: number): void {
    this.frameSeconds = dtSeconds;
    this.camera.update(dtSeconds);
    this.particles.update(dtSeconds);

    for (const effects of [this.lockFlashes, this.dropTrails]) {
      for (let i = effects.length - 1; i >= 0; i--) {
        effects[i].alpha -= dtSeconds * 5;
        if (effects[i].alpha <= 0) effects.splice(i, 1);
      }
    }
    // Update line clear flash fade
    for (let i = this.lineClearFlashRows.length - 1; i >= 0; i--) {
      const flash = this.lineClearFlashRows[i];
      flash.alpha -= dtSeconds * 5.5;
      if (flash.alpha <= 0) {
        this.lineClearFlashRows.splice(i, 1);
      }
    }
  }

  /**
   * Main render method called every animation frame
   */
  public render(
    board: Board,
    activePiece: ActivePiece | null,
    showGhost: boolean,
    blastReady = false
  ): void {
    const ctx = this.ctx;
    ctx.save();

    // Scale for High-DPI
    ctx.scale(this.dpr, this.dpr);

    ctx.clearRect(0, 0, this.boardPixelWidth, this.boardPixelHeight);

    // Apply Screen Shake
    if (this.screenShake && !this.reducedMotion && (this.camera.offsetX !== 0 || this.camera.offsetY !== 0)) {
      ctx.translate(this.camera.offsetX, this.camera.offsetY);
    }

    // 1. Clear background & draw stone altar backing
    ctx.fillStyle = '#111519';
    ctx.fillRect(0, this.spawnRows * this.tileSize, this.boardPixelWidth, VISIBLE_ROWS * this.tileSize);

    // Subtle cathedral glass grid lead mullions
    this.drawLeadedGrid(ctx);

    // Short light columns preserve the exact start and landing positions.
    for (const trail of this.dropTrails) {
      const top = Math.max(0, trail.top - VISIBLE_START_ROW + this.spawnRows) * this.tileSize;
      const bottom = (trail.bottom - VISIBLE_START_ROW + this.spawnRows) * this.tileSize;
      const gradient = ctx.createLinearGradient(0, top, 0, bottom);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, trail.color);
      ctx.globalAlpha = trail.alpha;
      ctx.fillStyle = gradient;
      ctx.fillRect(trail.x * this.tileSize, top, this.tileSize, bottom - top);
    }
    ctx.globalAlpha = 1;

    // 3. Draw Locked Tiles
    for (let r = VISIBLE_START_ROW; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        const cell = board.grid[r][c];
        if (cell) {
          const sprite = this.spriteCache.getSprite(cell);
          if (sprite) {
            const x = c * this.tileSize;
            const y = (r - VISIBLE_START_ROW + this.spawnRows) * this.tileSize;
            ctx.drawImage(sprite, x, y, this.tileSize, this.tileSize);
          }
        }
      }
    }

    for (const flash of this.lockFlashes) {
      ctx.globalAlpha = flash.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(flash.x * this.tileSize + 1, (flash.y - VISIBLE_START_ROW + this.spawnRows) * this.tileSize + 1, this.tileSize - 2, this.tileSize - 2);
    }
    ctx.globalAlpha = 1;
    if (board.getStackHeight() >= 16) {
      ctx.fillStyle = '#ef697b';
      ctx.fillRect(0, this.spawnRows * this.tileSize, this.boardPixelWidth, 2);
    }

    // 4. Draw Ghost Piece (if enabled & active piece exists)
    if (activePiece && showGhost) {
      const ghostY = calculateGhostY(activePiece, board.isCellBlocked);
      if (ghostY !== activePiece.y) {
        const ghostBlocks = getPieceBlocks(activePiece, 0, ghostY - activePiece.y);
        const ghostSprite = this.spriteCache.getSprite(`${activePiece.type}_GHOST`) || this.spriteCache.getSprite('GHOST');

        if (ghostSprite) {
          for (const pt of ghostBlocks) {
            if (pt.y >= VISIBLE_START_ROW) {
              const x = pt.x * this.tileSize;
              const y = (pt.y - VISIBLE_START_ROW + this.spawnRows) * this.tileSize;
              ctx.drawImage(ghostSprite, x, y, this.tileSize, this.tileSize);
            }
          }
        }
      }
    }

    if (activePiece && blastReady) {
      const { x, y } = board.getBlastTarget(activePiece);
      ctx.save();
      ctx.strokeStyle = '#ffc27f';
      ctx.fillStyle = '#ffb76c35';
      ctx.setLineDash([4, 3]);
      for (let r = Math.max(0, y - 1); r <= Math.min(BOARD_HEIGHT - 1, y + 1); r++) {
        for (let c = Math.max(0, x - 1); c <= Math.min(BOARD_WIDTH - 1, x + 1); c++) {
          const px = c * this.tileSize, py = (r - VISIBLE_START_ROW + this.spawnRows) * this.tileSize;
          if (board.grid[r][c]) ctx.fillRect(px, py, this.tileSize, this.tileSize);
          ctx.strokeRect(px + 1, py + 1, this.tileSize - 2, this.tileSize - 2);
        }
      }
      ctx.restore();
    }

    // Ease small movement only; drops and new spawns stay immediate.
    if (activePiece) {
      if (this.visualType !== activePiece.type || Math.abs(this.visualY - activePiece.y) > 2) {
        this.visualX = activePiece.x;
        this.visualY = activePiece.y;
      }
      const blend = this.reducedMotion ? 1 : 1 - Math.exp(-65 * this.frameSeconds);
      this.visualX += (activePiece.x - this.visualX) * blend;
      this.visualY += (activePiece.y - this.visualY) * blend;
      this.visualType = activePiece.type;
      const activeBlocks = getPieceBlocks(activePiece);
      const pieceSprite = this.spriteCache.getSprite(activePiece.type);

      if (pieceSprite) {
        for (const pt of activeBlocks) {
          if (pt.y >= VISIBLE_START_ROW - this.spawnRows) {
            const x = (pt.x + this.visualX - activePiece.x) * this.tileSize;
            const y = (pt.y + this.visualY - activePiece.y - VISIBLE_START_ROW + this.spawnRows) * this.tileSize;
            ctx.drawImage(pieceSprite, x, y, this.tileSize, this.tileSize);
          }
        }
      }
    }

    // 6. Draw Line Clear Radiant Light Beams
    if (this.lineClearFlashRows.length > 0) {
      for (const flash of this.lineClearFlashRows) {
        ctx.save();
        ctx.globalAlpha = flash.alpha;
        const fy = (flash.row + this.spawnRows) * this.tileSize;

        // Radiant sunlight beam
        const grad = ctx.createLinearGradient(0, fy, 0, fy + this.tileSize);
        grad.addColorStop(0, 'rgba(255, 240, 200, 0.95)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(1, 'rgba(255, 240, 200, 0.95)');

        ctx.fillStyle = grad;
        ctx.fillRect(0, fy, this.boardPixelWidth, this.tileSize);

        ctx.restore();
      }
    }

    // 7. Render Particle System (Glass Shards)
    if (this.showParticles && !this.reducedMotion) this.particles.render(ctx);

    ctx.restore();
  }

  private drawLeadedGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(214, 227, 232, 0.08)';
    ctx.lineWidth = 1;

    // Vertical lead mullions
    for (let c = 1; c < BOARD_WIDTH; c++) {
      const x = c * this.tileSize;
      ctx.beginPath();
      ctx.moveTo(x, this.spawnRows * this.tileSize);
      ctx.lineTo(x, this.boardPixelHeight);
      ctx.stroke();
    }

    // Horizontal lead came joints
    for (let r = 1; r < VISIBLE_ROWS; r++) {
      const y = (r + this.spawnRows) * this.tileSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.boardPixelWidth, y);
      ctx.stroke();
    }
  }


  /**
   * Render preview piece onto a smaller preview canvas
   */
  public static renderPieceToMiniCanvas(
    canvas: HTMLCanvasElement,
    type: TetrominoType | null,
    spriteCache: SpriteCache,
    tileSize = 22
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!type) return;

    const sprite = spriteCache.getSprite(type);
    if (!sprite) return;

    // Matrix definition
    const shape = type === 'I'
      ? [[1, 1, 1, 1]]
      : type === 'O'
      ? [[1, 1], [1, 1]]
      : type === 'T'
      ? [[0, 1, 0], [1, 1, 1]]
      : type === 'S'
      ? [[0, 1, 1], [1, 1, 0]]
      : type === 'Z'
      ? [[1, 1, 0], [0, 1, 1]]
      : type === 'J'
      ? [[1, 0, 0], [1, 1, 1]]
      : [[0, 0, 1], [1, 1, 1]];

    const rows = shape.length;
    const cols = shape[0].length;

    const totalW = cols * tileSize;
    const totalH = rows * tileSize;
    const offsetX = Math.round((canvas.width - totalW) / 2);
    const offsetY = Math.round((canvas.height - totalH) / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c] === 1) {
          ctx.drawImage(sprite, offsetX + c * tileSize, offsetY + r * tileSize, tileSize, tileSize);
        }
      }
    }
  }
}
