/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Stage Modifiers / Afflictions (Debuffs)
 */

import { StageModifierDefinition } from '../core/types';

export const STAGE_MODIFIERS: StageModifierDefinition[] = [
  {
    id: 'none',
    name: 'Normal',
    tag: 'CLEAR',
    description: 'Tanpa aturan tambahan.',
    effects: {}
  },
  {
    id: 'murky_vesper',
    name: 'Satu preview',
    tag: 'VISION',
    description: 'Hanya satu balok berikutnya yang terlihat.',
    effects: {
      previewCountOverride: 1
    }
  },
  {
    id: 'seismic_tremor',
    name: 'Baris naik',
    tag: 'PRESSURE',
    description: 'Satu baris penghalang naik setiap 22 detik.',
    effects: {
      periodicGarbageSecs: 22
    }
  },
  {
    id: 'accelerated_chant',
    name: 'Lebih cepat',
    tag: 'SPEED',
    description: 'Balok jatuh 1,8x lebih cepat.',
    effects: {
      gravityMultiplier: 1.8
    }
  },
  {
    id: 'lead_seal',
    name: 'Sudut tertutup',
    tag: 'OBSTACLE',
    description: 'Kedua sudut dasar papan terisi penghalang.',
    effects: {
      lockOuterColumns: true
    }
  },
  {
    id: 'fractured_bag',
    name: 'Tanpa balok I',
    tag: 'DROPS',
    description: 'Balok I tidak muncul selama stage ini.',
    effects: {
      excludePiece: 'I'
    }
  },
  {
    id: 'brittle_glass',
    name: 'Cepat mengunci',
    tag: 'TIMING',
    description: 'Balok mengunci dalam 280 ms setelah menyentuh tumpukan.',
    effects: {
      lockDelayOverride: 280
    }
  },
  {
    id: 'veil_of_shadow',
    name: 'Tanpa bayangan',
    tag: 'VISUAL',
    description: 'Posisi jatuh balok tidak ditampilkan.',
    effects: {
      disableGhostPiece: true
    }
  },
  {
    id: 'echoing_bells',
    name: 'Target ekstra',
    tag: 'TRIAL',
    description: 'Target baris bertambah 50%.',
    effects: {
      targetMultiplier: 1.5
    }
  }
];

export function getRandomModifier(stageNum: number): StageModifierDefinition {
  if (stageNum === 1) {
    // Stage 1 is gentle: no debuff
    return STAGE_MODIFIERS[0];
  }

  // Pick random non-none modifier
  const pool = STAGE_MODIFIERS.slice(1);
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}
