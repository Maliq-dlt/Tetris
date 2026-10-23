# Roguelite — fase 1

Requirement disetujui pengguna pada 23 Oktober 2026: target skor dengan batas balok, tiga build yang mengubah cara bermain, dan indikator pemicu kartu. Boss, consumable umum, serta jalur bercabang merupakan fase lanjutan.

## Aturan yang diimplementasikan

- Stage pertama: 1.500 skor dalam maksimal 40 placement. Target dasar berikutnya `round(1500 × stage^1.5)`, dikalikan modifier target bila ada. Skor stage terpisah dari skor total; soft/hard drop tidak menaikkan progres stage. Clear, T-spin, bom, dan hadiah kontrak menaikkannya.
- Target pada placement ke-40 tetap menang. Jika target belum tercapai setelah placement ke-40, run berakhir. Top out juga mengakhiri run; Second Wind tidak memperpanjang batas balok. Hold, putar, dan bom tidak menggunakan jatah placement.
- Pilih satu starter gratis di shop awal. Starter memakai satu dari enam slot, tidak bisa dijual, dan tidak masuk pool acak. Masih ada 20 kartu pasar, ditambah tiga signature starter. Kartu serta papan bertahan antarronde.
- **Combo / Safety Net:** satu placement tanpa clear mempertahankan combo, sekali per stage. Tidak memberikan skor untuk placement kosong. Bonus berikutnya melanjutkan chain; penyelamatan pulih setiap stage. Chain direset ketika berganti stage.
- **Demolition / Blast Core:** enam baris clear mengisi satu bom, tanpa menumpuk energi di atas enam. B, tombol LEDAKKAN, atau tombol View/Back gamepad menghancurkan kotak tersimpan dalam area 3×3 pada ghost. Area dipratinjau saat siap. Setiap kotak memberi 40 skor × level; ledakan tidak memberikan kredit baris, combo, perfect clear, atau energi. Jika area kosong, energi tetap tersedia. Energi tersisa bertahan antarronde.
- **Gambler / Double or Nothing:** kontrak opsional sebelum setiap stage. Tiga clear yang masing-masing minimal dua baris memberi 1.200 skor × level dan $4, sekali saja. Bila target stage tercapai sebelum kontrak selesai, kurangi saldo hingga $3 sebelum pendapatan dan bunga; saldo tidak negatif. Kontrak ditawarkan ulang pada stage berikutnya. Pilih PLAY tanpa mengambil kontrak untuk melewatkannya.
- Pemicu efek skor, ekonomi, dan starter menampilkan nama kartu beserta manfaatnya di samping papan dan menyorot kartu di inventory. Animasi menghormati reduced motion.

## Referensi GitHub yang diverifikasi

Snapshot API GitHub 23 Oktober 2026. Jendela aktivitas: 23 Juni–23 Oktober 2026. Angka star adalah keadaan saat pemeriksaan, bukan ambang kualitas atau jaminan kecocokan. Periksa ulang sebelum memakai kode/dependency.

| Repo | Star | Commit default branch terbaru yang diperiksa | Penggunaan sebagai referensi |
| --- | ---: | --- | --- |
| [Phaser](https://github.com/phaserjs/phaser) | 40.542 | [21 Agustus 2026](https://github.com/phaserjs/phaser/commit/02d8931b626d9764c133cbb3fbf99966c03c757c) | Pembanding kemampuan framework game browser; README resmi diperiksa. Fase ini tetap memakai Canvas/Vite yang ada. |
| [PixiJS](https://github.com/pixijs/pixijs) | 48.438 | [22 Oktober 2026](https://github.com/pixijs/pixijs/commit/b78ff35152f9b28fdf0289b54bc2deacd62956b6) | [Ticker.ts](https://github.com/pixijs/pixijs/blob/b78ff35152f9b28fdf0289b54bc2deacd62956b6/src/ticker/Ticker.ts): pembanding pemisahan waktu mentah dari delta animasi; perbaikan timer input sebelumnya dipertahankan. |
| [Mindustry](https://github.com/Anuken/Mindustry) | 29.443 | [22 Oktober 2026](https://github.com/Anuken/Mindustry/commit/b873c01ed559a8803c2dad5c5c79d7ad750d5b95) | [Objectives.java](https://github.com/Anuken/Mindustry/blob/b873c01ed559a8803c2dad5c5c79d7ad750d5b95/core/src/mindustry/game/Objectives.java): pembanding objective yang dapat diperiksa dan dijelaskan pada pemain. |

Sumber metadata: API `/repos/{owner}/{repo}` serta `/commits?per_page=1&until=2026-10-23T23:59:59Z` untuk masing-masing repo. Query `balatro stars:>20000 pushed:>2026-06-23` mengembalikan nol hasil; tidak mengklaim ada clone Balatro yang lolos kriteria tersebut. Phaser dan PixiJS berlisensi MIT; Mindustry GPL-3.0. Tidak ada kode atau aset dari ketiganya yang disalin dan tidak ada dependency baru.

## Bukti dan batas verifikasi

`npm test`: 52 tes lulus. `npm run build`: TypeScript dan Vite lulus. `git diff --check`: bersih. Tidak ada konfigurasi lint terpisah. Tes baru memakai Board/RunManager asli untuk target skor, budget, starter, combo, ledakan, kontrak, serta pemicu kartu. Tes handling yang sudah ada tetap dijalankan.

Browser memeriksa build produksi; fixture diagnostik hanya berada di `.tmp/rogue-qa` dan mengekspos instance pada salinan build untuk menyiapkan papan. Fixture membuktikan alur engine/UI dari clear aktual, bukan run alami oleh pemain: gagal karena budget, kemenangan balok terakhir, satu penyelamatan combo, bom berenergi enam, dan kontrak tiga double menuju shop berikutnya. Layar 390 px diperiksa tanpa overflow horizontal. Pengimbangan target/hadiah masih perlu playtest manusia; gamepad fisik belum diuji.
