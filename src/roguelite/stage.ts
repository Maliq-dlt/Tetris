/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Stage Generation & Progression
 */

import { StageInfo } from '../core/types';
import { getRandomModifier } from './modifiers';

export function generateStage(stageNumber: number): StageInfo {
  // Stage 1 is always 10 lines. Subsequent stages scale lines: 10, 12, 14, 16, 18, 20...
  const baseLines = 8 + stageNumber * 2;
  const modifier = getRandomModifier(stageNumber);

  // Apply modifier multiplier if applicable (e.g. Echoing Bells)
  const targetMultiplier = modifier.effects.targetMultiplier || 1.0;
  const targetValue = Math.round(baseLines * targetMultiplier);

  return {
    number: stageNumber,
    name: `Stage ${stageNumber}`,
    targetType: 'lines',
    targetValue,
    currentProgress: 0,
    modifier,
    cleared: false
  };
}
