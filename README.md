# VITRAIL

Stacker solo dengan 40 Lines, Blitz, Zen, Custom, dan roguelite berbasis kartu. TypeScript, Canvas, Vite; tanpa framework game tambahan.

## Jalankan dan verifikasi

```powershell
npm ci --cache .cache/npm
npm run dev
npm test
npm run build
npm run preview
```

Dev server: http://localhost:3000. Build menjalankan TypeScript checker dan Vite. Tidak ada konfigurasi lint terpisah. `.tmp/` dikecualikan dari Vitest karena memuat snapshot awal.

## Mode dan kontrol

- **Sprint 40:** hapus 40 baris secepat mungkin. Timer, PPS, dan rekor waktu; tanpa kartu, shop, debuff, atau Fever.
- **Blitz:** skor tertinggi dalam dua menit. Level gravitasi naik tiap lima baris, sampai level 15.
- **Zen:** latihan tanpa batas waktu atau target baris. Saat papan penuh, papan dikosongkan dan statistik sesi tetap berjalan.
- **Custom:** target 0–1.000 baris, waktu 0–3.600 detik, dan gravitasi level 1–15. Nol berarti tanpa batas; sesi selesai ketika salah satu target tercapai. Restart mempertahankan aturan.
- **Roguelite:** mulai dengan $8 dan pilih starter Combo, Demolition, atau Gambler di Rift Market. Capai target skor stage dalam 40 placement; stage pertama 1.500 skor. Skor drop tidak menaikkan progres stage. Tumpukan papan dan kartu bertahan antarronde. Run berakhir saat top out atau balok habis. Mekanik starter, kontrak, referensi GitHub, dan bukti uji ada di [fase 1](docs/gameplay-phase-1.md).
- **← / →** geser, **↑ / X** putar, **Z / Ctrl** putar berlawanan, **A** putar 180°.
- **↓** soft drop, **Space** hard drop, **C / Shift** hold.
- **P / Esc** pause, **R** restart, **M** mute, **O** settings, **F** FPS.
- **B / tombol LEDAKKAN / View gamepad:** bom Demolition ketika 6 energi penuh; area sasaran terlihat di ghost.
- **1 / 2 / 3** membeli kartu shop sesuai urutan, jika saldo dan slot cukup.

Default baru: DAS 100 ms, ARR 0, SDF ∞. ARR 0 mencapai dinding setelah DAS; SDF ∞ langsung turun ke ghost tanpa mengunci langsung. Pengaturan lama dipertahankan; tombol **Preset cepat** menerapkan ketiga default itu sekaligus. DCD 0–333 ms menunda auto-shift setelah putar/drop; reset DAS saat ganti arah dapat dimatikan. IRS/IHS keyboard menerapkan putar/hold yang ditahan saat countdown. Rotasi 180° memakai enam tes kick lokal; bonus kick kelima T-spin hanya untuk rotasi 90°. Settings dan kehilangan fokus mem-pause permainan. Keyboard dan gamepad didukung; kontrol sentuh belum tersedia.

## Kartu, debuff, dan shop

Ada **20 kartu pasar + 3 starter**, enam slot aktif, tanpa duplikat. Satu starter gratis wajib dipilih di shop awal dan memakai satu slot selama run. Starter tidak dijual atau ditawarkan acak. Pilihan shop acak, tiga kartu per kunjungan. Kartu common, rare, dan cursed menampilkan manfaat serta konsekuensi sebelum dibeli. Kartu dapat dijual seharga setengah harga awal (dibulatkan ke bawah). Reroll mulai $2 dan naik $1 setiap pemakaian, kembali $2 di shop berikutnya. Repair $5 menghapus empat baris dasar sekali per kunjungan; tidak memberikan skor atau progres clear.

Contoh sinergi: **T Factory + Twisted Deal** untuk T-spin; **Chain Reaction + Cash Cascade** untuk combo; **Compound + Payday** untuk tabungan; **Broke Genius** menggandakan skor clear saat saldo di bawah $3. **Constellation** menaikkan skor 15% per kartu aktif. **Glass Cannon** dan **Loaded Dice** menukar risiko gravitasi/sampah dengan pengali skor. **Double Pocket** memberi dua slot hold yang ditukar bergantian.

Pendapatan ronde: `$5 + nomor stage`, ditambah `$1 per 2.000 skor ronde` (maksimal $8), bunga `$1 per $5 saldo` (batas dasar $5), dan efek kartu. Bunga dihitung sebelum hadiah masuk. **Mint Condition** memberi $1 per placement yang melakukan clear; **Cash Cascade** memberi $2 pada clear dengan combo 3+. Saldo dan build direset saat run baru; tidak ada uang sungguhan atau pembelian daring.

Stage pertama tanpa debuff; stage berikutnya memakai salah satu dari delapan aturan: satu preview, sampah berkala, gravitasi cepat, sudut dasar tertutup, tanpa I, lock delay pendek, tanpa ghost, atau target skor ekstra. NEXT selalu mengikuti bag aktual, termasuk jaminan T dan perubahan pengecualian.

**Prism Fever:** 12 spark memicu skor clear 2× dan delapan baris berikutnya juga 2×. Clear memberi spark sejumlah baris + bonus chain (maksimal 3); placement tanpa clear mengurangi satu spark. Fever bertahan antarronde.

## Visual dan audio

Acuan visual TETR.IO diteliti melalui halaman publik, screenshot, CSS, dan analisis REA bootstrap. Menu horizontal, papan 10×20, dua baris spawn terlihat, jejak hard drop, lock flash, garis peringatan tumpukan tinggi, HOLD kiri, NEXT kanan, dan deck di samping arena. Lihat [catatan referensi](docs/tetrio-reference.md) untuk bukti dan batas analisis. Ini game solo lokal; multiplayer, akun, leaderboard server, replay jaringan, safe-lock, serta kesetaraan seluruh handling TETR.IO belum diimplementasikan.

Font pixel **Jersey 10**, Sarah Cadigan-Fried / Soft Type Project, disertakan lokal dengan lisensi SIL Open Font License di `public/fonts/OFL.txt`. Background `public/arena.svg` dan gambar kartu dibuat untuk proyek ini. Kode, font, dan artwork proprietary TETR.IO tidak disalin ke produksi.

**Vitrail Arcade** menyediakan efek orisinal melalui Web Audio: tap, rotasi, hold, drop, lock, clear bertingkat, combo, T-spin, B2B, perfect clear, countdown, dan hasil sesi. Pengguna baru memakai Arcade; pilihan Block Blast pengguna lama dipertahankan dan keduanya tersedia di Pengaturan. Narator tetap mati secara default.

Paket alternatif berisi **14 OGG Block Blast yang diberikan pengguna**. `public/audio/sfx/manifest.json` mencatat nama sumber, durasi, gain, dan SHA-256. OGG didekode menggunakan Web Audio; klik pertama membuka audio sesuai aturan browser. Pemilihan klip diverifikasi melalui file/decode; kualitas subjektif pasangan suara belum dinilai lewat pendengaran. Hak distribusi paket sumber tidak ditetapkan oleh repository ini.

**15 WAV KittenTTS** tetap lokal dan opsional; narator mati secara default. Model `KittenML/kitten-tts-nano-0.1`, voice `expr-voice-2-f`, PCM16 mono 24 kHz. Manifest di `public/audio/tts/manifest.json`. Mute menghentikan SFX/narator. Regenerasi opsional memakai environment legacy KittenTTS 0.1.3:

```powershell
$env:PYTHONUTF8 = '1'
$env:PYTHONDONTWRITEBYTECODE = '1'
python scripts/generate_tts.py
```

Generator menggunakan `.cache/kitten` dan `.tmp/kitten`. Model hanya diperlukan untuk regenerasi. Rekor dan pengaturan disimpan lokal bila storage tersedia; run tidak disimpan melewati reload.

## Verifikasi

23 Oktober 2026: `npm test` — 52 tes lulus; `npm run build` — TypeScript dan Vite lulus. Tidak ada script lint terpisah.

Tes juga mencakup timer Blitz, validasi Custom, Zen tanpa target, rekor terpisah per mode, DCD, arah DAS, held IRS/IHS, kick 180, dan envelope audio orisinal (stub Web Audio, bukan uji pendengaran). Tes mencakup board, rotasi, T-spin, bag, skor, Fever, input DAS/ARR, siklus Sprint 40 dengan clear papan aktual, transaksi shop, ekonomi/sinergi, repair, efek antrean kartu, dan hash audio. Pemeriksaan browser 23 Oktober mencakup lima mode di menu, akhir sesi Custom 2 detik, timer pause, beli/jual/reroll, OGG decode, oscillator Arcade nyata, settings, serta lobby/shop/arena 390 px. Pemeriksaan 21 Oktober mencakup movement/rotation/drop/hold, top out/restart, dan alur pause/settings/Escape. Alur clear ronde otomatis memakai Board/RunManager asli dalam tes; penyelesaian seluruh run oleh pemain dan gamepad fisik belum diuji.
