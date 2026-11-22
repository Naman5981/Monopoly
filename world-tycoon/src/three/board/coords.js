/**
 * three/board/coords.js
 * Geometric layout constants and Cartesian board-coordinate calculations.
 */

export const STEP = 3.15;
export const HALF_SPAN = 4 * STEP; // 12.6
export const BASE_TILE_Y = 0.34;
export const BASE_BUILDING_Y = 0.46;
export const TILE_WIDTH = 2.96;
export const TILE_DEPTH = 3.60;

/**
 * Calculates world-space (x, z) coordinates and the board side (0 to 3) for any tile ID (0 to 31).
 * @param {number} id - Tile ID on the board
 * @returns {{ x: number, z: number, side: number }}
 */
export function getTileWorldPosition(id) {
  if (id >= 0 && id <= 8) {
    const t = id / 8;
    return { x: HALF_SPAN - t * (2 * HALF_SPAN), z: HALF_SPAN, side: 0 };
  }
  if (id >= 8 && id <= 16) {
    const t = (id - 8) / 8;
    return { x: -HALF_SPAN, z: HALF_SPAN - t * (2 * HALF_SPAN), side: 1 };
  }
  if (id >= 16 && id <= 24) {
    const t = (id - 16) / 8;
    return { x: -HALF_SPAN + t * (2 * HALF_SPAN), z: -HALF_SPAN, side: 2 };
  }
  const t = (id - 24) / 8;
  return { x: HALF_SPAN, z: -HALF_SPAN + t * (2 * HALF_SPAN), side: 3 };
}

/**
 * Calculates dedicated curbside pawn standing offsets so pawns never step on or cover deed text.
 * @param {number} tileId
 * @param {number} playerIdx
 * @returns {{ x: number, z: number }}
 */
export function getPawnTileOffset(tileId, playerIdx = 0) {
  const isCorner = (tileId === 0 || tileId === 8 || tileId === 16 || tileId === 24);
  if (isCorner) {
    const cornerOffsets = [
      { x: -0.45, z: 0.45 },
      { x: 0.45, z: 0.45 },
      { x: -0.45, z: -0.45 },
      { x: 0.45, z: -0.45 },
      { x: -0.50, z: 0.0 },
      { x: 0.50, z: 0.0 }
    ];
    return cornerOffsets[playerIdx % cornerOffsets.length];
  }

  const pos = getTileWorldPosition(tileId);
  const spreadVariants = [-0.50, 0.50, -0.20, 0.20, -0.70, 0.70];
  const spread = spreadVariants[playerIdx % spreadVariants.length];
  const curbDist = 0.85; // positioned towards the inner avenue curb

  if (pos.side === 0) return { x: spread, z: -curbDist };
  if (pos.side === 1) return { x: curbDist, z: spread };
  if (pos.side === 2) return { x: spread, z: curbDist };
  return { x: -curbDist, z: spread };
}

/**
 * Returns the Y-axis rotation in radians required for an object on a tile to face the center/street.
 * @param {number} tileId
 * @returns {number}
 */
export function getTileFacingAngle(tileId) {
  const pos = getTileWorldPosition(tileId);
  if (pos.side === 0) return -Math.PI / 2;
  if (pos.side === 1) return Math.PI;
  if (pos.side === 2) return Math.PI / 2;
  return 0;
}
