/**
 * three/board/coords.js
 * Geometric layout constants and Cartesian board-coordinate calculations.
 */

export const STEP = 3.15;
export const HALF_SPAN = 4 * STEP; // 12.6
export const BASE_TILE_Y = 0.34;
export const BASE_BUILDING_Y = 0.46;

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
