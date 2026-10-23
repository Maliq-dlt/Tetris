/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * T-Spin Detection (3-Corner Rule & Mini vs Full)
 */

import { ActivePiece, TSpinResult } from './types';

export function detectTSpin(
  piece: ActivePiece,
  isCellBlocked: (x: number, y: number) => boolean
): TSpinResult {
  if (piece.type !== 'T' || !piece.lastActionWasRotate) {
    return 'none';
  }

  // T-piece 3x3 matrix center is at (x + 1, y + 1)
  const cx = piece.x + 1;
  const cy = piece.y + 1;

  // 4 diagonal corners
  const tl = isCellBlocked(cx - 1, cy - 1);
  const tr = isCellBlocked(cx + 1, cy - 1);
  const bl = isCellBlocked(cx - 1, cy + 1);
  const br = isCellBlocked(cx + 1, cy + 1);

  const cornerCount = (tl ? 1 : 0) + (tr ? 1 : 0) + (bl ? 1 : 0) + (br ? 1 : 0);

  // 3-corner rule: Must have at least 3 occupied corners
  if (cornerCount < 3) {
    return 'none';
  }

  // Determine front corners based on rotation state
  // Rotation 0: T points UP. Front corners: TL, TR
  // Rotation 1: T points RIGHT. Front corners: TR, BR
  // Rotation 2: T points DOWN. Front corners: BL, BR
  // Rotation 3: T points LEFT. Front corners: TL, BL
  let front1 = false;
  let front2 = false;

  switch (piece.rotation) {
    case 0:
      front1 = tl;
      front2 = tr;
      break;
    case 1:
      front1 = tr;
      front2 = br;
      break;
    case 2:
      front1 = bl;
      front2 = br;
      break;
    case 3:
      front1 = tl;
      front2 = bl;
      break;
  }

  const frontCount = (front1 ? 1 : 0) + (front2 ? 1 : 0);

  // If both front corners are blocked -> Full T-Spin
  if (frontCount === 2) {
    return 'full';
  }

  // Guideline exception: If wall kick used was the 5th test (index 4), it promotes to Full T-Spin
  if (piece.lastKickIndex === 4 && !piece.lastRotateWas180) {
    return 'full';
  }

  return 'mini';
}
