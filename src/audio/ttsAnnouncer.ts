/** Pre-rendered KittenTTS voice pack. One narrator, no overlapping speech. */
export const SPOKEN_LINES = {
  single: 'Nice cut!', double: 'Double sparkle!', triple: 'Triple shatter!',
  tetris: 'Tetris! Beautifully done!', tspin: 'What a twist!', b2b: 'Back to back!',
  perfect_clear: 'Flawless! Every last shard!', relic: 'A little power. A little chaos.',
  stage_clear: 'Chamber clear! Pick your power.', game_over: 'Every masterpiece starts with a few broken pieces.',
  combo_2: 'Looking sharp!', combo_3: 'Keep that sparkle going!',
  combo_5: 'Brilliant! You are on fire!', combo_8: 'Unstoppable! What a masterpiece!',
  fever: 'Prism fever! Let it shine!'
};
export type AnnouncementType = keyof typeof SPOKEN_LINES;

export function clearVoice(lines: number, tspin: boolean, b2b: boolean, perfect: boolean, combo: number): AnnouncementType {
  if (perfect) return 'perfect_clear';
  if (combo >= 8) return 'combo_8';
  if (combo >= 5) return 'combo_5';
  if (tspin) return 'tspin';
  if (b2b && lines === 4) return 'b2b';
  if (lines === 4) return 'tetris';
  if (combo >= 3) return 'combo_3';
  if (combo === 2) return 'combo_2';
  return lines === 3 ? 'triple' : lines === 2 ? 'double' : 'single';
}

export class TtsAnnouncer {
  private mode: 'procedural' | 'kitten_tts' | 'speech_synth' = 'procedural';
  private audioCache = new Map<AnnouncementType, HTMLAudioElement>();
  private current: HTMLAudioElement | null = null;
  private pending: AnnouncementType | null = null;
  private volume = 0.7;
  private muted = false;
  private generation = 0;

  constructor() {
    for (const type of Object.keys(SPOKEN_LINES) as AnnouncementType[]) {
      const audio = new Audio(`./audio/tts/${type}.wav`);
      audio.preload = 'auto';
      this.audioCache.set(type, audio);
    }
  }

  public setMode(mode: 'procedural' | 'kitten_tts' | 'speech_synth'): void {
    if (mode !== this.mode) this.stop();
    this.mode = mode;
  }

  public setVolume(volume: number, muted = false): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.muted = muted;
    if (muted || this.volume === 0) this.stop();
    if (this.current) this.current.volume = this.volume;
  }

  public stop(): void {
    this.generation++;
    this.pending = null;
    this.current?.pause();
    this.current = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  public announce(type: AnnouncementType): void {
    if (this.muted || this.volume === 0 || this.mode === 'procedural') return;
    const urgent = ['game_over', 'stage_clear', 'relic'].includes(type);
    if (urgent) this.stop();
    if (this.mode === 'speech_synth') {
      this.speakWebSpeech(type);
      return;
    }
    if (this.current) {
      this.pending = type; // Keep only the newest reaction; never build a stale queue.
      return;
    }
    const audio = this.audioCache.get(type)!;
    const generation = this.generation;
    this.current = audio;
    audio.currentTime = 0;
    audio.volume = this.volume;
    const finish = () => {
      if (generation !== this.generation || this.current !== audio) return;
      this.current = null;
      const next = this.pending;
      this.pending = null;
      if (next) this.announce(next);
    };
    audio.onended = finish;
    audio.onerror = finish;
    void audio.play().catch(finish);
  }

  private speakWebSpeech(type: AnnouncementType): void {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(SPOKEN_LINES[type]);
    utterance.lang = 'en-US';
    utterance.rate = 1.08;
    utterance.volume = this.volume;
    window.speechSynthesis.speak(utterance);
  }
}
