/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Guideline Scoring, Combos, Back-to-Back & Perfect Clear
 */

import { TSpinResult } from './types';

export function calculateClearScore(
  linesCleared: number,
  tspin: TSpinResult,
  level: number,
  isBackToBack: boolean,
  comboCount: number,
  isPerfectClear: boolean,
  b2bScoreMultiplier = 1.5,
  comboBonusFlat = 50,
  scoreGlobalMultiplier = 1.0
): { baseScore: number; finalScore: number; maintainsB2B: boolean; isDifficultClear: boolean } {
  let baseScore = 0;
  let isDifficultClear = false;

  if (tspin === 'full') {
    isDifficultClear = true;
    switch (linesCleared) {
      case 0:
        baseScore = 400 * level;
        break;
      case 1:
        baseScore = 800 * level;
        break;
      case 2:
        baseScore = 1200 * level;
        break;
      case 3:
        baseScore = 1600 * level;
        break;
    }
  } else if (tspin === 'mini') {
    isDifficultClear = true;
    switch (linesCleared) {
      case 0:
        baseScore = 100 * level;
        break;
      case 1:
        baseScore = 200 * level;
        break;
      case 2:
        baseScore = 400 * level;
        break;
    }
  } else {
    // Regular clears
    switch (linesCleared) {
      case 1:
        baseScore = 100 * level;
        break;
      case 2:
        baseScore = 300 * level;
        break;
      case 3:
        baseScore = 500 * level;
        break;
      case 4:
        baseScore = 800 * level;
        isDifficultClear = true;
        break;
    }
  }

  let finalScore = baseScore;

  // Apply B2B Bonus
  if (isBackToBack && isDifficultClear && linesCleared > 0) {
    finalScore = Math.floor(finalScore * b2bScoreMultiplier);
  }

  // Apply Combo Bonus
  if (comboCount > 0) {
    finalScore += comboBonusFlat * comboCount * level;
  }

  // Apply Perfect Clear
  if (isPerfectClear) {
    const pcBonus = linesCleared === 4 ? 2000 * level : 1000 * level;
    finalScore += pcBonus;
  }

  finalScore = Math.floor(finalScore * scoreGlobalMultiplier);

  const maintainsB2B = linesCleared === 0 ? true : isDifficultClear;

  return {
    baseScore,
    finalScore,
    maintainsB2B,
    isDifficultClear
  };
}
