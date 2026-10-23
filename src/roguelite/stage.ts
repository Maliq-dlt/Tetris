/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Stage Generation & Progression
 */

import { StageInfo } from '../core/types';
import { getRandomModifier } from './modifiers';

export function generateStage(stageNumber: number): StageInfo {
  const modifier = getRandomModifier(stageNumber);
  const targetValue = Math.round(1500 * stageNumber ** 1.5 * (modifier.effects.targetMultiplier || 1));

  return {
    number: stageNumber,
    name: `Stage ${stageNumber}`,
    targetType: 'score',
    targetValue,
    currentProgress: 0,
    pieceLimit: 40,
    piecesUsed: 0,
    modifier,
    cleared: false
  };
}
