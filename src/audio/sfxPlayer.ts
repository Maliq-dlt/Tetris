/** Original arcade synthesis plus the user-provided local Block Blast pack. */
import manifest from '../../public/audio/sfx/manifest.json';

type Clip = keyof typeof manifest.clips;

export class SfxPlayer {
  private pack: 'arcade' | 'blockblast' = 'blockblast';
  public get isArcade(): boolean { return this.pack === 'arcade'; }

  public setPack(pack: 'arcade' | 'blockblast'): void {
    this.pack = pack;
    if (this.ctx) this.init();
  }

  private ctx: AudioContext | null = null;
  private output: GainNode | null = null;
  private buffers = new Map<Clip, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private volume = .7;
  private lastTap = -1;
  private lastDrop = -1;

  public init(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.output = this.ctx.createGain();
      this.output.gain.value = this.volume;
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.ratio.value = 8;
      this.output.connect(limiter);
      limiter.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
    if (this.pack === 'arcade') {
      const status = document.getElementById('audio-status');
      if (status) status.textContent = 'Vitrail Arcade · efek sintetis lokal aktif';
      return;
    }
    if (this.buffers.size === Object.keys(manifest.clips).length) {
      const status = document.getElementById('audio-status');
      if (status) status.textContent = 'Block Blast · 14 efek suara lokal';
      return;
    }
    if (this.loading) return;
    this.loading = Promise.all(Object.entries(manifest.clips).map(async ([key, clip]) => {
      const response = await fetch(`./audio/sfx/${clip.file}`);
      if (!response.ok) throw new Error(`${clip.file}: HTTP ${response.status}`);
      this.buffers.set(key as Clip, await this.ctx!.decodeAudioData(await response.arrayBuffer()));
    })).then(() => {
      const status = document.getElementById('audio-status');
      if (status && this.pack === 'blockblast') status.textContent = 'Block Blast · 14 efek suara lokal';
      this.loading = null;
    }).catch(error => {
      console.warn('SFX pack could not load', error);
      this.loading = null;
      const status = document.getElementById('audio-status');
      if (status) status.textContent = 'Sebagian audio gagal dimuat. Klik tes suara untuk mencoba lagi.';
    });
  }

  public setSfxVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.output) this.output.gain.setTargetAtTime(this.volume, this.ctx.currentTime, .01);
  }

  private play(key: Clip, level = 1, rate = 1): void {
    if (this.pack === 'arcade') { this.playArcade(key, level, rate); return; }
    const buffer = this.buffers.get(key);
    if (!this.ctx || !this.output || !buffer || this.volume === 0) return;
    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    gain.gain.value = manifest.clips[key].gain * level;
    source.connect(gain);
    gain.connect(this.output);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start();
  }

  /** Short envelopes avoid clicks; every oscillator releases its graph on completion. */
  private tone(hz: number, end: number, delay: number, seconds: number, level: number, type: OscillatorType = 'triangle'): void {
    if (!this.ctx || !this.output || this.volume === 0) return;
    const oscillator = this.ctx.createOscillator(), gain = this.ctx.createGain();
    const at = this.ctx.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(hz, at);
    oscillator.frequency.exponentialRampToValueAtTime(end, at + seconds);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(.12 * level, at + .003);
    gain.gain.exponentialRampToValueAtTime(.0001, at + seconds);
    oscillator.connect(gain); gain.connect(this.output);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(at); oscillator.stop(at + seconds + .01);
  }

  private playArcade(key: Clip, level: number, rate: number): void {
    if (key === 'move') { this.tone(650, 420, 0, .025, level, 'square'); return; }
    if (key === 'rotate') { this.tone(520, 920, 0, .045, level); return; }
    if (key === 'drop') { this.tone(190, 42, 0, .12, level, 'sine'); this.tone(1100, 180, 0, .035, level * .4, 'triangle'); return; }
    if (key === 'lock') { this.tone(150, 75, 0, .055, level); return; }
    if (key === 'hold') { this.tone(330, 660, 0, .065, level); return; }
    if (key === 'combo') { this.tone(660 * rate, 990 * rate, 0, .11, level * .5); return; }
    const notes = key === 'gameover' ? [392, 330, 262, 131]
      : key === 'tspin' ? [392, 587, 784, 1175]
      : key === 'stage' ? [523, 659, 784, 1047, 1319]
      : key === 'select' ? [440, 660]
      : [523, 659, 784, 1047].slice(0, Number(key.slice(-1)));
    notes.forEach((hz, i) => this.tone(hz, hz, i * .038, .16, level * .55));
  }

  public playCountdown(count: number): void {
    if (this.isArcade) this.tone(count ? 440 : 880, count ? 440 : 1320, 0, count ? .055 : .14, .45, 'square');
    else if (!count) this.play('select', .4);
  }
  public playPerfectClear(): void { this.play('stage', .75); }
  public playB2b(): void { if (this.isArcade) this.tone(196, 392, .02, .13, .35, 'sine'); }

  public playMove(): void {
    if (!this.ctx || this.ctx.currentTime - this.lastTap < .055) return;
    this.lastTap = this.ctx.currentTime;
    this.play('move', .35);
  }
  public playRotate(): void { this.play('rotate', .45); }
  public playHardDrop(): void { this.lastDrop = this.ctx?.currentTime ?? -1; this.play('drop', .85); }
  public playLock(): void {
    if (this.ctx && this.ctx.currentTime - this.lastDrop >= .07) this.play('lock', .55);
  }
  public playHold(): void { this.play('hold', .6); }
  public playLineClear(lines: number): void { this.play(`clear${Math.max(1, Math.min(4, lines))}` as Clip); }
  public playCombo(combo: number): void { this.play('combo', 1, 1 + Math.min(10, Math.max(0, combo - 2)) * .045); }
  public playTSpin(): void { this.play('tspin'); }
  public playRelicSelect(): void { this.play('select', .7); }
  public playStageClear(): void { this.play('stage'); }
  public playGameOver(): void { this.play('gameover', .8); }
}
