/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Constants & SRS Kick Data
 */

import { BlockColor, TetrominoType } from './types';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 24; // 4 hidden spawn rows + 20 visible rows
export const VISIBLE_START_ROW = 4;
export const VISIBLE_ROWS = 20;

export const DEFAULT_LOCK_DELAY_MS = 500;
export const DEFAULT_MAX_LOCK_RESETS = 15;
export const DEFAULT_DAS_MS = 100;
export const DEFAULT_ARR_MS = 0;
export const DEFAULT_SOFT_DROP_FACTOR = 41;

// Six-test 180 kicks in board coordinates (positive Y is down).
// ponytail: local SRS extension; exact TETR.IO runtime equivalence needs replay evidence.
export const KICKS_180: Record<number, number[][]> = {
  0: [[0, 0], [0, -1], [1, -1], [-1, -1], [1, 0], [-1, 0]],
  1: [[0, 0], [1, 0], [1, -2], [1, -1], [0, -2], [0, -1]],
  2: [[0, 0], [0, 1], [-1, 1], [1, 1], [-1, 0], [1, 0]],
  3: [[0, 0], [-1, 0], [-1, -2], [-1, -1], [0, -2], [0, -1]]
};

/**
 * Cathedral Stained Glass Palettes
 * Curated warm gem tones with faceted highlights and dark lead borders
 */
export const STAINED_GLASS_COLORS: Record<TetrominoType | 'GARBAGE' | 'LEAD', BlockColor> = {
  I: {
    id: 'I',
    name: 'Sapphire Azure',
    base: '#3eade3',
    light: '#86d6f5',
    shadow: '#237baa',
    lead: '#0d131a',
    causticGlow: 'rgba(25, 118, 210, 0.45)'
  },
  J: {
    id: 'J',
    name: 'Cobalt Night',
    base: '#537ce6',
    light: '#92aff7',
    shadow: '#3657ac',
    lead: '#0b0e14',
    causticGlow: 'rgba(40, 53, 147, 0.45)'
  },
  L: {
    id: 'L',
    name: 'Honey Amber',
    base: '#f18d43',
    light: '#ffc183',
    shadow: '#bd592b',
    lead: '#140f0a',
    causticGlow: 'rgba(239, 108, 0, 0.45)'
  },
  O: {
    id: 'O',
    name: 'Sunlit Citrine',
    base: '#edc549',
    light: '#ffe38a',
    shadow: '#b28a29',
    lead: '#141208',
    causticGlow: 'rgba(251, 192, 45, 0.45)'
  },
  S: {
    id: 'S',
    name: 'Malachite Emerald',
    base: '#65bf7e',
    light: '#9ee0ae',
    shadow: '#3b8c54',
    lead: '#0a140d',
    causticGlow: 'rgba(46, 125, 50, 0.45)'
  },
  T: {
    id: 'T',
    name: 'Royal Amethyst',
    base: '#a47be3',
    light: '#cbb1f6',
    shadow: '#7750b1',
    lead: '#130a17',
    causticGlow: 'rgba(123, 31, 162, 0.45)'
  },
  Z: {
    id: 'Z',
    name: 'Ruby Claret',
    base: '#e97691',
    light: '#f7b0c1',
    shadow: '#b04c67',
    lead: '#140a0f',
    causticGlow: 'rgba(194, 24, 91, 0.45)'
  },
  GARBAGE: {
    id: 'GARBAGE',
    name: 'Smoked Quartz',
    base: '#455a64',
    light: '#90a4ae',
    shadow: '#263238',
    lead: '#111518',
    causticGlow: 'rgba(69, 90, 100, 0.3)'
  },
  LEAD: {
    id: 'LEAD',
    name: 'Indestructible Lead',
    base: '#212529',
    light: '#495057',
    shadow: '#0f1114',
    lead: '#050608',
    causticGlow: 'rgba(33, 37, 41, 0.2)'
  }
};

/**
 * Standard Tetromino Shape Matrices in 4 Rotation States (0, 1, 2, 3)
 * Grid is standard [row][col] where 1 is mino.
 */
export const TETROMINO_SHAPES: Record<TetrominoType, number[][][]> = {
  I: [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0]
    ],
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0]
    ],
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0]
    ]
  ],
  J: [
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0]
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1]
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0]
    ]
  ],
  L: [
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1]
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0]
    ],
    [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0]
    ]
  ],
  O: [
    [
      [1, 1],
      [1, 1]
    ],
    [
      [1, 1],
      [1, 1]
    ],
    [
      [1, 1],
      [1, 1]
    ],
    [
      [1, 1],
      [1, 1]
    ]
  ],
  S: [
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1]
    ],
    [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 0]
    ],
    [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0]
    ]
  ],
  T: [
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0]
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0]
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0]
    ]
  ],
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0]
    ],
    [
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 1]
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0]
    ]
  ]
};

/**
 * Super Rotation System (SRS) Wall Kick Data
 * Standard guidelines: 5 tests per rotation transition.
 * Coordinates are [dx, dy] where +x is right, +y is down on canvas!
 * Note: Tetris guideline standard defines +y as UP, but in screen coordinates, +y is DOWN.
 * We convert standard guideline kicks where up is -y for board arrays.
 */
export const SRS_KICKS_JLSTZ: Record<string, [number, number][]> = {
  '0->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1->0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1->2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3->2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3->0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],

  // 180° rotation kicks (standard Tetris guideline extension)
  '0->2': [[0, 0], [0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0]],
  '2->0': [[0, 0], [0, -1], [-1, -1], [1, -1], [-1, 0], [1, 0]],
  '1->3': [[0, 0], [1, 0], [1, 2], [1, 1], [0, 2], [0, 1]],
  '3->1': [[0, 0], [-1, 0], [-1, 2], [-1, 1], [0, 2], [0, 1]]
};

export const SRS_KICKS_I: Record<string, [number, number][]> = {
  '0->1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1->0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1->2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2->1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2->3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3->2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3->0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0->3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],

  // 180° kicks for I
  '0->2': [[0, 0], [-1, 0], [-2, 0], [1, 0], [2, 0], [0, 1]],
  '2->0': [[0, 0], [1, 0], [2, 0], [-1, 0], [-2, 0], [0, -1]],
  '1->3': [[0, 0], [0, 1], [0, 2], [0, -1], [0, -2], [-1, 0]],
  '3->1': [[0, 0], [0, -1], [0, -2], [0, 1], [0, 2], [1, 0]]
};
