/**
 * VITRAIL: Stained Glass Tetris Roguelite
 * Piece Representation & SRS Rotation
 */

import { ActivePiece, Point, RotationState, TetrominoType } from './types';
import { KICKS_180, SRS_KICKS_I, SRS_KICKS_JLSTZ, TETROMINO_SHAPES } from './constants';

export function createPiece(type: TetrominoType): ActivePiece {
  // Standard spawn positions:
  // I and O spawn in middle columns (I: x=3, y=2; O: x=4, y=2; others: x=3, y=2 in 10x24 board)
  const x = type === 'O' ? 4 : 3;
  const y = type === 'I' ? 2 : 2;

  return {
    type,
    rotation: 0,
    x,
    y,
    lastKickIndex: 0,
    lastActionWasRotate: false,
    movesSinceTouchGround: 0,
    lockTimer: 0
  };
}

export function getPieceShape(type: TetrominoType, rotation: RotationState): number[][] {
  return TETROMINO_SHAPES[type][rotation];
}

/**
 * Returns absolute grid coordinates for each solid mino of the piece
 */
export function getPieceBlocks(piece: ActivePiece, offsetX = 0, offsetY = 0, overrideRot?: RotationState): Point[] {
  const rotation = overrideRot !== undefined ? overrideRot : piece.rotation;
  const matrix = TETROMINO_SHAPES[piece.type][rotation];
  const blocks: Point[] = [];
  const originX = piece.x + offsetX;
  const originY = piece.y + offsetY;

  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] === 1) {
        blocks.push({ x: originX + c, y: originY + r });
      }
    }
  }

  return blocks;
}

/**
 * Checks if piece at target coordinates/rotation collides with board or bounds
 */
export function isPieceColliding(
  piece: ActivePiece,
  offsetX: number,
  offsetY: number,
  rotation: RotationState,
  isCellBlocked: (x: number, y: number) => boolean
): boolean {
  const blocks = getPieceBlocks(piece, offsetX, offsetY, rotation);
  for (let i = 0; i < blocks.length; i++) {
    const pt = blocks[i];
    if (isCellBlocked(pt.x, pt.y)) {
      return true;
    }
  }
  return false;
}

/**
 * Attempt SRS rotation with wall kicks
 */
export function tryRotatePiece(
  piece: ActivePiece,
  direction: 'cw' | 'ccw' | '180',
  isCellBlocked: (x: number, y: number) => boolean
): { success: boolean; newPiece: ActivePiece; kickIndex: number } {
  let targetRotation: RotationState;

  if (direction === 'cw') {
    targetRotation = ((piece.rotation + 1) % 4) as RotationState;
  } else if (direction === 'ccw') {
    targetRotation = ((piece.rotation + 3) % 4) as RotationState;
  } else {
    targetRotation = ((piece.rotation + 2) % 4) as RotationState;
  }

  // O piece doesn't need kicks
  if (piece.type === 'O') {
    return {
      success: true,
      newPiece: {
        ...piece,
        rotation: targetRotation,
        lastActionWasRotate: true,
        lastKickIndex: 0
      },
      kickIndex: 0
    };
  }

  const kickKey = `${piece.rotation}->${targetRotation}`;
  const kickTable = piece.type === 'I' ? SRS_KICKS_I : SRS_KICKS_JLSTZ;
  const kicks = direction === '180' ? KICKS_180[piece.rotation] : kickTable[kickKey];

  for (let i = 0; i < kicks.length; i++) {
    const [dx, dy] = kicks[i];
    if (!isPieceColliding(piece, dx, dy, targetRotation, isCellBlocked)) {
      return {
        success: true,
        newPiece: {
          ...piece,
          x: piece.x + dx,
          y: piece.y + dy,
          rotation: targetRotation,
          lastActionWasRotate: true,
          lastRotateWas180: direction === '180',
          lastKickIndex: i
        },
        kickIndex: i
      };
    }
  }

  return { success: false, newPiece: piece, kickIndex: 0 };
}

/**
 * Calculate Ghost Piece landing Y position
 */
export function calculateGhostY(
  piece: ActivePiece,
  isCellBlocked: (x: number, y: number) => boolean
): number {
  let dropY = 0;
  while (!isPieceColliding(piece, 0, dropY + 1, piece.rotation, isCellBlocked)) {
    dropY++;
  }
  return piece.y + dropY;
}
