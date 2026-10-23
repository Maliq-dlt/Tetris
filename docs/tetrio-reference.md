# TETR.IO reconstruction notes

Reference: https://tetr.io/ · investigation 21 and 23 October 2026.

## Evidence

Used the explicitly requested [reverse-engineer-anything skill](https://github.com/morluto/rea). Reimported and validated the existing REA evidence bundle on 23 October, without repeating its static analysis.

- Parent: `ev_5d9b3245badd5df43aeae6dc95514598ddc201202cdef3919f992e4a46d74b95`.
- Summary: `ev_89ba7550cb2fcf5234f4a0a603ac4db463dd45da22761947afb0400e5ee07ec6`.
- Public HTML/CSS and bootstrap: one JavaScript file parsed, 25,249 AST nodes, no parse failure. Semantic graph is partial: 100,000-node ceiling and 2,133 unknowns. Static evidence does not establish gameplay runtime equivalence.
- Captured bootstrap SHA-256: `324b4ed15419461b6570c4cb791eee57cbb8bdefe9c602f2ed658a0c4f8d2c19`.
- Fresh browser visit on 23 October reached the WebGL requirement/guest gate. No agreement accepted or account created. Exact live engine behavior and subjective audio matching remain unverified.
- Local captures and the 35 MB evidence export stay in ignored `.tmp/reference-tetrio/`; no proprietary reference code, font or artwork is shipped.

## Mapping

| Reference observation | Local implementation | Boundary |
| --- | --- | --- |
| Broad colored menu bars and condensed lettering | Pixel font Jersey 10 (OFL), stacked mode bars, original block landscape | Original branding and assets |
| HOLD left, NEXT right, 10×20 board, visible spawn | Same layout, two visible spawn rows, five previews, time/PPS/line metrics | Canvas renderer |
| 40 LINES, BLITZ, ZEN, CUSTOM | 40-line timer; two-minute score challenge; endless practice; configurable line/time/level rules | Local equivalents; Blitz level curve and Zen board reset are local rules |
| DAS/ARR/DCD/SDF controls, IRS/IHS options | DAS/ARR including zero ARR, DCD after rotation/drop, optional DAS carry, instant SDF, keyboard hold/rotate during countdown | Exact timing equivalence and general between-piece buffering not established; no safe-lock option |
| Responsive rotate/drop/clear feedback | SRS 90°, six-test local 180° kicks, drop columns, lock flash, clear particles, combo/B2B/T-spin banners | 180° table is an explicit local extension |
| Event-based arcade sound | Original oscillator/envelope pack with event cues, optional user-provided Block Blast OGG pack | TETR.IO proprietary audio is not redistributed; no background music |
| User-requested roguelike layer | 20 cards, six slots, curses, Fever, buy/sell/reroll/repair, round income and interest | Separate from standard solo modes |

## Delivery boundary

This repository is a runnable local solo stacker inspired by TETR.IO. Multiplayer, accounts, ranked matchmaking, online leaderboards, exact proprietary assets/audio and replay compatibility are not implemented. Source and distributable assets are committed; generated builds, captured references, credentials and caches are ignored.

Automated verification: `npm test` (38 tests) and `npm run build` (TypeScript + Vite). Audio tests validate schedules/muting/node cleanup; browser decoding validates real sample files. Neither establishes subjective sound quality or one-to-one acoustic matching. Physical gamepad and a human-completed full roguelite run are untested.

Browser checks on 23 October: two-second Custom session reached its result screen at 0:02.000; pause froze the timer; shop buy/sell/reroll changed balances and slots; all 14 OGGs decoded; Arcade created a real oscillator in a running AudioContext; 390 px lobby/shop/arena had no horizontal overflow. No console errors/warnings in the clean final browser session.
