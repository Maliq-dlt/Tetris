import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { AudioManager } from '../src/audio/audioManager';
import { RunManager } from '../src/roguelite/runManager';
import { clearVoice, SPOKEN_LINES, TtsAnnouncer } from '../src/audio/ttsAnnouncer';

const clips: FakeAudio[] = [];
class FakeAudio {
  currentTime = 0;
  volume = 1;
  preload = '';
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  constructor(public src: string) { clips.push(this); }
}
afterEach(() => { vi.unstubAllGlobals(); clips.length = 0; });

describe('Prism Fever run lifecycle', () => {
  it('rewards chains, doubles eight following lines, and resets between runs', () => {
    const run = new RunManager();
    expect(run.registerPrismClear(4, 1)).toEqual({ multiplier: 1, activated: false });
    expect(run.registerPrismClear(4, 2)).toEqual({ multiplier: 1, activated: false });
    expect(run.registerPrismClear(1, 3)).toEqual({ multiplier: 2, activated: true });
    expect(run.feverLines).toBe(8);
    run.registerPrismClear(0, 0);
    expect(run.feverLines).toBe(8);
    expect(run.registerPrismClear(4, 1).multiplier).toBe(2);
    expect(run.registerPrismClear(4, 2).multiplier).toBe(2);
    expect(run.feverLines).toBe(0);
    expect(run.registerPrismClear(1, 3).multiplier).toBe(1);
    run.resetRun();
    expect([run.prismCharge, run.feverLines]).toEqual([0, 0]);
  });
  it('cools unused charge without allowing negative charge', () => {
    const run = new RunManager();
    run.registerPrismClear(2, 1);
    for (let i = 0; i < 5; i++) run.registerPrismClear(0, 0);
    expect(run.prismCharge).toBe(0);
  });
});

describe('KittenTTS reactions', () => {
  it('selects exactly one reaction, with a perfect clear taking priority', () => {
    expect(clearVoice(4, true, true, true, 8)).toBe('perfect_clear');
    expect(clearVoice(1, false, false, false, 8)).toBe('combo_8');
    expect(clearVoice(1, false, false, false, 5)).toBe('combo_5');
    expect(clearVoice(2, true, false, false, 1)).toBe('tspin');
    expect(clearVoice(4, false, true, false, 1)).toBe('b2b');
    expect(clearVoice(1, false, false, false, 2)).toBe('combo_2');
  });
  it('never overlaps voices, keeps the latest reaction, and cancels on mute', () => {
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('window', {});
    const narrator = new TtsAnnouncer();
    narrator.setMode('kitten_tts');
    narrator.setVolume(.35);
    narrator.announce('combo_2');
    narrator.announce('combo_3');
    narrator.announce('combo_5');
    const find = (key: string) => clips.find(a => a.src.endsWith(`/${key}.wav`))!;
    expect(find('combo_2').volume).toBe(.35);
    expect(find('combo_3').play).not.toHaveBeenCalled();
    find('combo_2').onended!();
    expect(find('combo_5').play).toHaveBeenCalledOnce();
    narrator.setVolume(.35, true);
    expect(find('combo_5').pause).toHaveBeenCalledOnce();
    narrator.announce('game_over');
    expect(find('game_over').play).not.toHaveBeenCalled();
  });
  it('ships real PCM WAVs matching the generator manifest and spoken copy', () => {
    const root = new URL('../public/audio/tts/', import.meta.url);
    const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
    expect(manifest.engine).toBe('KittenTTS');
    for (const [key, text] of Object.entries(SPOKEN_LINES)) {
      const wav = readFileSync(new URL(`${key}.wav`, root));
      expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
      expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
      expect(wav.readUInt32LE(24)).toBe(24000);
      expect(manifest.clips[key].text).toBe(text);
      expect(manifest.clips[key].seconds).toBeGreaterThan(.4);
      expect(createHash('sha256').update(wav).digest('hex')).toBe(manifest.clips[key].sha256);
    }
  });
});

describe('puzzle audio mix', () => {
  it('keeps routine clears quiet, narrates milestones once, and restores volume after mute', () => {
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('window', {});
    const audio = new AudioManager();
    const clear = vi.spyOn(audio.sfx, 'playLineClear').mockImplementation(() => {});
    vi.spyOn(audio.sfx, 'playCombo').mockImplementation(() => {});
    const volume = vi.spyOn(audio.sfx, 'setSfxVolume');
    const voice = vi.spyOn(audio.tts, 'announce');
    audio.initFromSettings({ das: 133, arr: 16, softDropMultiplier: 20, sfxVolume: .35,
      ttsMode: 'kitten_tts', screenShake: true, ghostPiece: true, particles: true });
    audio.playClear(1, false, false, false, 1, false);
    audio.playClear(2, false, false, false, 2, false);
    expect(clear).toHaveBeenCalledOnce();
    expect(voice).not.toHaveBeenCalled();
    audio.playClear(1, false, false, false, 3, false);
    expect(voice).toHaveBeenCalledExactlyOnceWith('combo_3');
    voice.mockClear();
    audio.playClear(4, false, false, true, 8, true);
    expect(voice).toHaveBeenCalledExactlyOnceWith('fever');
    audio.toggleMute();
    expect(volume).toHaveBeenLastCalledWith(0);
    audio.playClear(4, false, false, false, 5, false);
    expect(voice).toHaveBeenCalledTimes(1);
    audio.toggleMute();
    expect(volume).toHaveBeenLastCalledWith(.35);
  });
});
