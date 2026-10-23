import { RelicDefinition } from '../core/types';

export const ALL_RELICS: RelicDefinition[] = [
  {
    "id": "cathedral_bell",
    "name": "DOUBLE POCKET",
    "subtitle": "HOLD ENGINE",
    "icon": "II",
    "price": 7,
    "rarity": "cursed",
    "buffDescription": "Dua slot hold, berputar saat ditukar.",
    "effects": {
      "holdSlotBonus": 1,
      "lockDelayModifier": -75
    },
    "isCurseTradeoff": true,
    "curseDescription": "Lock delay −75 ms."
  },
  {
    "id": "prophets_window",
    "name": "ORACLE",
    "subtitle": "INFORMATION",
    "icon": "?",
    "price": 5,
    "rarity": "common",
    "buffDescription": "Dua NEXT tambahan. Skor clear +10%.",
    "effects": {
      "previewBonus": 2,
      "scoreMultiplier": 1.1
    },
    "isCurseTradeoff": false
  },
  {
    "id": "heavy_lead_cane",
    "name": "BULLDOZER",
    "subtitle": "BOARD BREAKER",
    "icon": "___",
    "price": 12,
    "rarity": "rare",
    "buffDescription": "Sebelum hard drop, baris dasar dengan ≥8 kotak dihancurkan.",
    "effects": {},
    "isCurseTradeoff": false
  },
  {
    "id": "prism_of_alexandria",
    "name": "GLASS CANNON",
    "subtitle": "HIGH STAKES",
    "icon": "X1.4",
    "price": 6,
    "rarity": "cursed",
    "buffDescription": "Skor clear ×1,4.",
    "effects": {
      "scoreMultiplier": 1.4,
      "gravityMultiplier": 1.25
    },
    "isCurseTradeoff": true,
    "curseDescription": "Gravitasi 25% lebih cepat."
  },
  {
    "id": "martyrs_shard",
    "name": "TWISTED DEAL",
    "subtitle": "T-SPIN BUILD",
    "icon": "T",
    "price": 6,
    "rarity": "cursed",
    "buffDescription": "Skor T-spin ×2.",
    "effects": {
      "tSpinScoreMultiplier": 2
    },
    "isCurseTradeoff": true,
    "curseDescription": "Single tanpa T-spin memberi 0 skor."
  },
  {
    "id": "rose_medallion",
    "name": "SLOW BURN",
    "subtitle": "TIME ENGINE",
    "icon": "+250",
    "price": 6,
    "rarity": "cursed",
    "buffDescription": "Lock delay +250 ms dan 10 reset tambahan.",
    "effects": {
      "lockDelayModifier": 250,
      "maxLockResetsBonus": 10,
      "dasModifier": 35
    },
    "isCurseTradeoff": true,
    "curseDescription": "DAS +35 ms."
  },
  {
    "id": "sunlit_vitrail",
    "name": "CONSTELLATION",
    "subtitle": "COLLECTION BUILD",
    "icon": "*",
    "price": 8,
    "rarity": "rare",
    "buffDescription": "Skor clear +15% per kartu aktif, termasuk kartu ini.",
    "effects": {
      "scorePerRelic": 0.15
    },
    "isCurseTradeoff": false
  },
  {
    "id": "cursed_solder",
    "name": "LOADED DICE",
    "subtitle": "CURSED ENGINE",
    "icon": "X1.65",
    "price": 5,
    "rarity": "cursed",
    "buffDescription": "Skor clear ×1,65.",
    "effects": {
      "scoreMultiplier": 1.65,
      "periodicGarbageSecs": 28
    },
    "isCurseTradeoff": true,
    "curseDescription": "Satu baris sampah naik setiap 28 detik."
  },
  {
    "id": "monks_patience",
    "name": "OATHKEEPER",
    "subtitle": "B2B BUILD",
    "icon": "B2B",
    "price": 7,
    "rarity": "cursed",
    "buffDescription": "Pengali B2B naik dari ×1,5 ke ×2,2.",
    "effects": {
      "b2bScoreMultiplier": 2.2
    },
    "isCurseTradeoff": true,
    "curseDescription": "B2B putus: tambah satu baris sampah."
  },
  {
    "id": "gilded_chancel",
    "name": "T FACTORY",
    "subtitle": "BAG ENGINE",
    "icon": "TTT",
    "price": 8,
    "rarity": "rare",
    "buffDescription": "Setiap balok ke-5 adalah T.",
    "effects": {
      "guaranteedPieceInterval": {
        "type": "T",
        "interval": 5
      }
    },
    "isCurseTradeoff": false
  },
  {
    "id": "onyx_shroud",
    "name": "DEEP DIVER",
    "subtitle": "DROP BUILD",
    "icon": "VV",
    "price": 5,
    "rarity": "cursed",
    "buffDescription": "Skor soft drop ×5.",
    "effects": {
      "softDropScoreMultiplier": 5,
      "previewBonus": -1
    },
    "isCurseTradeoff": true,
    "curseDescription": "NEXT berkurang satu."
  },
  {
    "id": "abbots_chalice",
    "name": "CHAIN REACTION",
    "subtitle": "COMBO BUILD",
    "icon": "+++",
    "price": 8,
    "rarity": "rare",
    "buffDescription": "Bonus combo naik dari 50 ke 170 per langkah.",
    "effects": {
      "comboBonusFlat": 170
    },
    "isCurseTradeoff": false
  },
  {
    "id": "crucible_of_light",
    "name": "CLEAN SLATE",
    "subtitle": "PERFECT CLEAR",
    "icon": "0",
    "price": 10,
    "rarity": "rare",
    "buffDescription": "Perfect clear memberi bonus 10.000 skor.",
    "effects": {},
    "isCurseTradeoff": false
  },
  {
    "id": "amber_reliquary",
    "name": "BROKE GENIUS",
    "subtitle": "ECONOMY GAMBIT",
    "icon": "$0",
    "price": 5,
    "rarity": "cursed",
    "buffDescription": "Skor clear ×2 saat saldo kurang dari $3.",
    "effects": {
      "lowWalletMultiplier": 2
    },
    "isCurseTradeoff": true,
    "curseDescription": "Bonus mati saat saldo $3 atau lebih."
  },
  {
    "id": "faceted_oculus",
    "name": "SECOND WIND",
    "subtitle": "SURVIVAL",
    "icon": "1UP",
    "price": 10,
    "rarity": "cursed",
    "buffDescription": "Satu kali: hapus 7 baris area atas saat top out.",
    "effects": {
      "topOutSecondChance": true
    },
    "isCurseTradeoff": true,
    "curseDescription": "Maksimal tiga NEXT."
  },
  {
    "id": "seraphs_feather",
    "name": "INFINITE SPIN",
    "subtitle": "LOCK ENGINE",
    "icon": "INF",
    "price": 7,
    "rarity": "cursed",
    "buffDescription": "999 reset lock tambahan per balok.",
    "effects": {
      "maxLockResetsBonus": 999,
      "dasModifier": 25
    },
    "isCurseTradeoff": true,
    "curseDescription": "DAS +25 ms."
  },
  {
    "id": "coin_press",
    "name": "MINT CONDITION",
    "subtitle": "CLEAR ECONOMY",
    "icon": "$+",
    "price": 5,
    "rarity": "common",
    "buffDescription": "Setiap placement yang menghapus baris memberi $1.",
    "effects": {
      "coinsPerClear": 1
    },
    "isCurseTradeoff": false
  },
  {
    "id": "chain_wallet",
    "name": "CASH CASCADE",
    "subtitle": "COMBO ECONOMY",
    "icon": "$$",
    "price": 6,
    "rarity": "common",
    "buffDescription": "Setiap clear pada combo 3+ memberi $2.",
    "effects": {
      "comboCoins": 2
    },
    "isCurseTradeoff": false
  },
  {
    "id": "compound_interest",
    "name": "COMPOUND",
    "subtitle": "SAVINGS BUILD",
    "icon": "%",
    "price": 5,
    "rarity": "common",
    "buffDescription": "Batas bunga antarronde naik dari $5 ke $10.",
    "effects": {
      "interestCapBonus": 5
    },
    "isCurseTradeoff": false
  },
  {
    "id": "payday",
    "name": "PAYDAY",
    "subtitle": "ROUND ECONOMY",
    "icon": "+3",
    "price": 5,
    "rarity": "common",
    "buffDescription": "Bonus $3 setiap ronde selesai.",
    "effects": {
      "roundCoins": 3
    },
    "isCurseTradeoff": false
  }
];

export function getRandomRelicChoices(count: number, currentRelicIds: string[]): RelicDefinition[] {
  const eligible = ALL_RELICS.filter(r => !currentRelicIds.includes(r.id));
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  return eligible.slice(0, count);
}
