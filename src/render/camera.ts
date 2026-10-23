/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Camera Screen Shake & Smooth Trauma Decay
 */

export class Camera {
  private trauma = 0;
  public offsetX = 0;
  public offsetY = 0;
  private maxOffset = 8; // Max pixels of shake

  public addTrauma(amount: number): void {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  public update(dtSeconds: number): void {
    if (this.trauma > 0) {
      // Quadratic shake falloff
      const shake = this.trauma * this.trauma;
      const angle = Math.random() * Math.PI * 2;
      const dist = shake * this.maxOffset;

      this.offsetX = Math.cos(angle) * dist;
      this.offsetY = Math.sin(angle) * dist;

      // Decay trauma
      this.trauma = Math.max(0, this.trauma - dtSeconds * 2.5);
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
    }
  }
}
