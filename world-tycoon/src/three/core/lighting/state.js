/**
 * three/core/lighting/state.js
 * Shared lighting state, mesh registries, and callbacks.
 */

export let currentBulbMode = 'day';
export function setCurrentBulbMode(mode) {
  currentBulbMode = mode;
}

export let currentBulbBoardStyle = 'wood';
export function setCurrentBulbBoardStyle(style) {
  currentBulbBoardStyle = style;
}

export const streetBulbMaterials = [];
export const streetFilamentMaterials = [];
export const streetGlassMaterials = [];
export const streetGlowSprites = [];
export const streetGroundLightPools = [];
export const streetLightBeams = [];
export const streetPointLights = [];

export let streetLampsGroup = null;
export function setStreetLampsGroup(group) {
  streetLampsGroup = group;
}

export let onLightingThemeChanged = null;
export function setLightingThemeCallback(fn) {
  onLightingThemeChanged = fn;
}
