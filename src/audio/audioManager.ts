/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Master Audio Manager
 */

import { SfxPlayer } from './sfxPlayer';
import { TtsAnnouncer, clearVoice } from './ttsAnnouncer';
import { GameSettings } from '../core/types';

export class AudioManager {
  public sfx: SfxPlayer;
  public tts: TtsAnnouncer;
  private isMuted = false;
  private sfxVolume = 0.7;

  constructor() {
    this.sfx = new SfxPlayer();
    this.tts = new TtsAnnouncer();
  }

  public initFromSettings(settings: GameSettings): void {
    this.sfxVolume = settings.sfxVolume;
    this.sfx.setPack(settings.sfxPack ?? 'blockblast');
    this.tts.setMode(settings.ttsMode);
    this.applyVolumes();
  }

  private applyVolumes(): void {
    this.sfx.setSfxVolume(this.isMuted ? 0 : this.sfxVolume);
    this.tts.setVolume(this.sfxVolume, this.isMuted);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.applyVolumes();
    return this.isMuted;
  }

  public onFirstInteraction(): void {
    try { this.sfx.init(); }
    catch {
      const status = document.getElementById('audio-status');
      if (status) status.textContent = 'Audio tidak tersedia di browser ini.';
    }
    this.applyVolumes();
  }

  public playClear(lines: number, tspin: boolean, b2b: boolean, perfect: boolean, combo: number, fever: boolean): void {
    if (this.isMuted) return;
    if (perfect && this.sfx.isArcade) this.sfx.playPerfectClear();
    else if (combo > 1 || fever) this.sfx.playCombo(fever ? 8 : combo);
    else if (tspin) this.sfx.playTSpin();
    else if (lines > 0) this.sfx.playLineClear(lines);
    if (b2b && lines > 0) this.sfx.playB2b();
    if (fever || perfect || lines === 4 || combo === 3 || combo === 5 || combo === 8) {
      this.tts.announce(fever ? 'fever' : clearVoice(lines, tspin, b2b, perfect, combo));
    }
  }

  public playCountdown(count: number): void {
    if (!this.isMuted) this.sfx.playCountdown(count);
  }

  public playMove(): void {
    if (this.isMuted) return;
    this.sfx.playMove();
  }

  public playRotate(): void {
    if (this.isMuted) return;
    this.sfx.playRotate();
  }

  public playHardDrop(): void {
    if (this.isMuted) return;
    this.sfx.playHardDrop();
  }

  public playLock(): void {
    if (this.isMuted) return;
    this.sfx.playLock();
  }

  public playHold(): void {
    if (this.isMuted) return;
    this.sfx.playHold();
  }

  public playRelicSelect(): void {
    if (this.isMuted) return;
    this.sfx.playRelicSelect();
  }

  public playStageClear(): void {
    if (this.isMuted) return;
    this.sfx.playStageClear();
  }

  public playGameOver(): void {
    if (this.isMuted) return;
    this.sfx.playGameOver();
  }
}
