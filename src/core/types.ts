/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Core Type Definitions
 */

export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export type RotationState = 0 | 1 | 2 | 3; // 0: Spawn, 1: 90° CW, 2: 180°, 3: 270° CCW

export type Point = { x: number; y: number };

export type BlockColor = {
  id: string;
  name: string;
  base: string;        // Inner glass color
  light: string;       // Highlight / refraction color
  shadow: string;      // Deep faceted shade
  lead: string;        // Lead came border
  causticGlow: string; // Translucent glow cast on stone
};

export interface ActivePiece {
  type: TetrominoType;
  rotation: RotationState;
  x: number; // Board grid X
  y: number; // Board grid Y
  lastRotateWas180?: boolean;
  lastKickIndex: number; // For T-spin mini vs full detection
  lastActionWasRotate: boolean;
  movesSinceTouchGround: number;
  lockTimer: number; // in ms
}

export type TSpinResult = 'none' | 'mini' | 'full';

export interface LineClearEvent {
  linesCleared: number;
  clearedRowIndices: number[];
  isTSpin: TSpinResult;
  isBackToBack: boolean;
  comboCount: number;
  isPerfectClear: boolean;
  baseScore: number;
  finalScore: number;
}

export interface GameSettings {
  dcd?: number;      // DAS cut delay after rotate/drop (ms)
  cancelDas?: boolean;
  initialActions?: boolean;
  sfxPack?: 'arcade' | 'blockblast';
  das: number;        // Delayed Auto Shift (ms)
  arr: number;        // Auto Repeat Rate (ms)
  softDropMultiplier: number;
  sfxVolume: number;
  ttsMode: 'procedural' | 'kitten_tts' | 'speech_synth';
  screenShake: boolean;
  ghostPiece: boolean;
  particles: boolean;
}

export interface RelicEffect {
  coinsPerClear?: number;
  comboCoins?: number;
  interestCapBonus?: number;
  roundCoins?: number;
  scorePerRelic?: number;
  lowWalletMultiplier?: number;
  // Direct parameter modifiers
  holdSlotBonus?: number;
  previewBonus?: number;
  lockDelayModifier?: number; // e.g. +250 or -100
  scoreMultiplier?: number;   // e.g. 1.25 (+25%)
  gravityMultiplier?: number;
  dasModifier?: number;
  maxLockResetsBonus?: number;
  b2bScoreMultiplier?: number;
  tSpinScoreMultiplier?: number;
  comboBonusFlat?: number;
  periodicGarbageSecs?: number; // Cursed periodic garbage
  guaranteedPieceInterval?: { type: TetrominoType; interval: number };
  excludedPieces?: TetrominoType[];
  softDropScoreMultiplier?: number;
  topOutSecondChance?: boolean; // Once per run revive
}

export interface RelicDefinition {
  id: string;
  price: number;
  rarity: 'common' | 'rare' | 'cursed';
  name: string;
  subtitle: string;
  icon: string;
  buffDescription: string;
  curseDescription?: string;
  effects: RelicEffect;
  isCurseTradeoff: boolean;
}

export interface StageModifierDefinition {
  id: string;
  name: string;
  tag: string;
  description: string;
  effects: {
    previewCountOverride?: number;
    periodicGarbageSecs?: number;
    gravityMultiplier?: number;
    lockOuterColumns?: boolean;
    excludePiece?: TetrominoType;
    lockDelayOverride?: number;
    disableGhostPiece?: boolean;
    targetMultiplier?: number;
  };
}

export interface StageInfo {
  number: number;
  name: string;
  targetType: 'lines' | 'score';
  targetValue: number;
  currentProgress: number;
  modifier: StageModifierDefinition;
  cleared: boolean;
}

export interface RunStats {
  score: number;
  highScore: number;
  lines: number;
  chambersCleared: number;
  tspins: number;
  tetrises: number;
  maxCombo: number;
  currentCombo: number;
  b2bStreak: number;
  relicsCollected: RelicDefinition[];
}

export type GameMode = 'roguelite' | 'sprint' | 'blitz' | 'zen' | 'custom';

export interface SoloRules {
  targetLines: number;
  timeLimitMs: number;
  level: number;
}
