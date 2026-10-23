"""Generate the shipped English Glassmaker voice pack with KittenTTS nano 0.1."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache' / 'kitten'
WORK = ROOT / '.tmp' / 'kitten'
for directory in (CACHE, WORK):
    directory.mkdir(parents=True, exist_ok=True)
for variable in ('TMP', 'TEMP', 'TMPDIR'):
    os.environ[variable] = str(WORK)
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ['HF_HUB_DISABLE_XET'] = '1'

import tempfile
tempfile.tempdir = str(WORK)
import json
import hashlib
import importlib.metadata
import numpy as np
import espeakng_loader
from huggingface_hub import hf_hub_download, try_to_load_from_cache
from phonemizer.backend.espeak.wrapper import EspeakWrapper
from kittentts import KittenTTS
import soundfile as sf

os.environ['ESPEAK_DATA_PATH'] = str(espeakng_loader.get_data_path())
EspeakWrapper.set_library(espeakng_loader.get_library_path())

MODEL = 'KittenML/kitten-tts-nano-0.1'
VOICE = 'expr-voice-2-f'
LINES = {
    'single': 'Nice cut!', 'double': 'Double sparkle!', 'triple': 'Triple shatter!',
    'tetris': 'Tetris! Beautifully done!', 'tspin': 'What a twist!', 'b2b': 'Back to back!',
    'perfect_clear': 'Flawless! Every last shard!', 'relic': 'A little power. A little chaos.',
    'stage_clear': 'Chamber clear! Pick your power.',
    'game_over': 'Every masterpiece starts with a few broken pieces.',
    'combo_2': 'Looking sharp!', 'combo_3': 'Keep that sparkle going!',
    'combo_5': 'Brilliant! You are on fire!', 'combo_8': 'Unstoppable! What a masterpiece!',
    'fever': 'Prism fever! Let it shine!'
}

def model_file(name):
    # Read an existing shared model if present; all new downloads stay in this project.
    cached = try_to_load_from_cache(MODEL, name)
    return cached if isinstance(cached, str) else hf_hub_download(MODEL, name, cache_dir=str(CACHE))

def main():
    tts = KittenTTS(model_path=model_file('kitten_tts_nano_v0_1.onnx'), voices_path=model_file('voices.npz'))
    output = ROOT / 'public' / 'audio' / 'tts'
    output.mkdir(parents=True, exist_ok=True)
    manifest = {'engine': 'KittenTTS', 'package_version': importlib.metadata.version('kittentts'),
                'model': MODEL, 'voice': VOICE, 'sample_rate': 24000, 'speed': 1.08, 'clips': {}}
    np.random.seed(42)
    for key, text in LINES.items():
        audio = np.asarray(tts.generate(text, voice=VOICE, speed=1.08), dtype=np.float32).reshape(-1)
        if not len(audio) or not np.isfinite(audio).all():
            raise ValueError(f'Invalid generated audio: {key}')
        # Trim leading/trailing silence, gentle fades, and keep clear headroom.
        non_silent = np.flatnonzero(np.abs(audio) > .008)
        if not len(non_silent):
            raise ValueError(f'Silent generated audio: {key}')
        audio = audio[max(0, non_silent[0]-720):min(len(audio), non_silent[-1]+1440)]
        audio *= .88 / max(.001, float(np.max(np.abs(audio))))
        fade = min(120, len(audio)//2)
        audio[:fade] *= np.linspace(0, 1, fade)
        audio[-fade:] *= np.linspace(1, 0, fade)
        path = WORK / f'{key}.wav'
        sf.write(path, audio, 24000, subtype='PCM_16')
        manifest['clips'][key] = {'text': text, 'seconds': round(len(audio)/24000, 3),
                                  'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        print(f'{key}: {len(audio)/24000:.2f}s', flush=True)
    # Publish only after every clip has generated successfully.
    for key in LINES:
        (WORK / f'{key}.wav').replace(output / f'{key}.wav')
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print('Published 15 verified KittenTTS clips.', flush=True)

if __name__ == '__main__':
    main()
