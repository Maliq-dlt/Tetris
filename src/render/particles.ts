/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Object-Pooled Glass Shard Particle System
 * Zero per-frame allocations & high performance
 */

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
}

export class ParticlePool {
  private pool: Particle[] = [];
  private poolSize: number;

  constructor(size = 250) {
    this.poolSize = size;
    for (let i = 0; i < size; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 0,
        color: '#ffffff',
        alpha: 1,
        rotation: 0,
        rotationSpeed: 0,
        life: 0,
        maxLife: 1
      });
    }
  }

  public spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    color: string,
    maxLife = 0.5
  ): void {
    // Find first inactive particle
    for (let i = 0; i < this.poolSize; i++) {
      const p = this.pool[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.size = size;
        p.color = color;
        p.alpha = 1;
        p.rotation = Math.random() * Math.PI * 2;
        p.rotationSpeed = (Math.random() - 0.5) * 8;
        p.life = 0;
        p.maxLife = maxLife;
        return;
      }
    }
  }

  /**
   * Spawns radiant shattered stained glass shards along a cleared line
   */
  public spawnLineClearShatter(
    boardPixelX: number,
    boardPixelY: number,
    boardWidth: number,
    rowHeight: number,
    color: string
  ): void {
    const shardCount = 20;
    for (let i = 0; i < shardCount; i++) {
      const px = boardPixelX + Math.random() * boardWidth;
      const py = boardPixelY + Math.random() * rowHeight;
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 40; // upward burst
      const size = 3 + Math.random() * 5;
      const life = 0.4 + Math.random() * 0.4;

      this.spawn(px, py, vx, vy, size, color, life);
    }
  }

  /**
   * Spawns subtle glass impact dust on hard drop
   */
  public spawnImpactDust(x: number, y: number, color: string): void {
    for (let i = 0; i < 8; i++) {
      const vx = (Math.random() - 0.5) * 80;
      const vy = -Math.random() * 50;
      const size = 2 + Math.random() * 3;
      this.spawn(x, y, vx, vy, size, color, 0.3);
    }
  }

  public update(dtSeconds: number): void {
    const gravity = 400; // gravity for shards

    for (let i = 0; i < this.poolSize; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life += dtSeconds;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      // Physics
      p.x += p.vx * dtSeconds;
      p.y += p.vy * dtSeconds;
      p.vy += gravity * dtSeconds;
      p.rotation += p.rotationSpeed * dtSeconds;

      // Alpha decay
      p.alpha = Math.max(0, 1 - (p.life / p.maxLife));
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.poolSize; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      ctx.fillStyle = p.color;
      // Draw angular glass shard polygon
      ctx.beginPath();
      ctx.moveTo(-p.size, -p.size / 2);
      ctx.lineTo(p.size, -p.size / 2);
      ctx.lineTo(p.size / 2, p.size);
      ctx.closePath();
      ctx.fill();

      // Specular highlight edge
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }
  }
}
