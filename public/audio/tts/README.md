# The Glassmaker · KittenTTS voice pack

15 file WAV KittenTTS sudah tersedia. Lihat `manifest.json` untuk model, versi paket, voice, speed, teks, durasi, dan SHA-256 tiap klip.

- Clear: single, double, triple, tetris, tspin, b2b, perfect_clear.
- Chain: combo_2, combo_3, combo_5, combo_8, fever.
- Run: relic, stage_clear, game_over.

PCM16 mono, 24 kHz. Regenerasi: `python scripts/generate_tts.py` dari root proyek dengan environment legacy KittenTTS yang dijelaskan di README utama. Generator memakai model nano 0.1 dan voice perempuan bawaan, tanpa voice cloning.

KittenTTS mode hanya memainkan WAV ini. Browser speech adalah mode terpisah yang dipilih secara eksplisit; procedural mode tidak memakai suara narator. Audio ditunda sampai interaksi pertama sesuai kebijakan browser.
