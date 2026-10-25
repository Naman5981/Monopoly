/**
 * three/core/lighting/anim.js
 * Frame-rate animation loops for lamp flicker, avatar aura breathing, and dynamic tile illuminations.
 */

import { context } from '../context.js';
import { BOARD_TILES, PLAYER_THEMES } from '../../../game/data.js';
import { gameState } from '../../../game/state.js';
import { BASE_TILE_Y, getTileWorldPosition } from '../../board/coords.js';
import { movingHopDestTileId } from '../../board/tilePress.js';
import {
  currentBulbMode,
  currentBulbBoardStyle,
  streetPointLights,
  streetGlowSprites,
  streetBulbMaterials
} from './state.js';

/**
 * Street lamp organic glow and filament breathing across day, sunset, and night modes.
 * In morning / day mode on normal boards (wood/elegant), streetlamps stay turned off.
 * On cyber board or during sunset/night, active neon/warm filament breathing is animated.
 * @param {number} t - Time in seconds
 */
export function updateStreetLampGlow(t) {
  // Daytime on normal board: keep lights completely turned off
  if (currentBulbMode === 'day' && currentBulbBoardStyle !== 'cyberpunk') {
    streetPointLights.forEach(pl => {
      pl.intensity = 0;
      pl.visible = false;
    });
    streetGlowSprites.forEach(spMat => {
      spMat.opacity = 0;
      spMat.visible = false;
    });
    streetBulbMaterials.forEach(bMat => {
      bMat.emissiveIntensity = 0;
    });
    return;
  }

  const basePulse = Math.sin(t * 3.5) * 0.04;
  let baseIntensity = 1.35;
  let baseOpacity = 0.60;
  let baseEmissive = 2.0;

  if (currentBulbMode === 'night') {
    baseIntensity = 2.0;
    baseOpacity = 0.85;
    baseEmissive = 2.8;
  } else if (currentBulbMode === 'sunset') {
    baseIntensity = 1.7;
    baseOpacity = 0.70;
    baseEmissive = 2.4;
  } else if (currentBulbBoardStyle === 'cyberpunk') {
    baseIntensity = 1.6;
    baseOpacity = 0.70;
    baseEmissive = 2.2;
  }

  streetPointLights.forEach((pl, idx) => {
    const lampNoise = Math.sin(t * 5.0 + idx * 1.3) * 0.03;
    pl.intensity = Math.max(0, baseIntensity * (1 + basePulse + lampNoise));
    pl.visible = true;
  });
  streetGlowSprites.forEach((spMat, idx) => {
    const lampNoise = Math.cos(t * 4.2 + idx * 1.7) * 0.03;
    spMat.opacity = Math.max(0, Math.min(1, baseOpacity + lampNoise));
    spMat.visible = true;
  });
  streetBulbMaterials.forEach((bMat, idx) => {
    const lampNoise = Math.sin(t * 4.5 + idx * 1.5) * 0.04;
    bMat.emissiveIntensity = baseEmissive * (1 + lampNoise);
  });
}

/**
 * Updates avatar personal point light and aura breathing in night / sunset modes.
 * @param {number} t - Time in seconds
 */
export function updateAvatarBreathingLights(t) {
  if (currentBulbMode === 'day') return;
  context.playerMeshes.forEach((mesh, idx) => {
    const ud = mesh?.userData;
    if (!ud?.avatarLight) return;
    if (currentBulbMode === 'night') {
      const pulse = Math.sin(t * 3.2 + idx * 1.5) * 0.12;
      ud.avatarLight.intensity = Math.max(0, 1.4 * (1 + pulse));
      if (ud.groundAura) ud.groundAura.material.opacity = Math.max(0, 0.45 * (1 + pulse * 0.6));
    } else if (currentBulbMode === 'sunset') {
      const pulse = Math.sin(t * 2.8 + idx * 1.5) * 0.08;
      ud.avatarLight.intensity = Math.max(0, 0.65 * (1 + pulse));
      if (ud.groundAura) ud.groundAura.material.opacity = Math.max(0, 0.22 * (1 + pulse * 0.5));
    } else {
      ud.avatarLight.intensity = 0.0;
      if (ud.groundAura) ud.groundAura.material.opacity = 0.0;
    }
  });
}

/**
 * Dynamic block illumination in night / sunset mode (pressed tiles, player presence, soft ground halo).
 * @param {number} t - Time in seconds
 */
export function updateTileIlluminationsAndPressLight(t) {
  const isNightBulb = (currentBulbMode === 'night');
  const isSunsetBulb = (currentBulbMode === 'sunset');
  const nightFactor = isNightBulb ? 1.0 : (isSunsetBulb ? 0.35 : 0.0);
  if (nightFactor <= 0.001) return;

  let maxIllumTileId = null;
  let maxIllumVal = 0;

  BOARD_TILES.forEach(tile => {
    const state2 = context.activeTileDepressions[tile.id];
    const mesh = context.tilesMeshMap[tile.id];
    const pool = context.tileGroundLightPools[tile.id];
    let illumData = context.activeTileIlluminations[tile.id];
    if (!illumData) {
      illumData = context.activeTileIlluminations[tile.id] = { currentIllum: 0 };
    }
    if (!mesh) return;

    if (nightFactor <= 0.001) {
      if (illumData.currentIllum > 0.001) {
        illumData.currentIllum *= 0.82;
        if (illumData.currentIllum < 0.001) illumData.currentIllum = 0;
      }
      if (pool) pool.visible = false;
      const topMat = mesh.userData?.topMat || (Array.isArray(mesh.material) ? mesh.material[2] : null);
      const sideMat = mesh.userData?.sideMat || (Array.isArray(mesh.material) ? mesh.material[0] : null);
      if (topMat && topMat.emissiveIntensity > 0) {
        topMat.emissive.setHex(0x000000);
        topMat.emissiveIntensity = 0;
      }
      if (sideMat && sideMat.emissiveIntensity > 0) {
        sideMat.emissive.setHex(0x000000);
        sideMat.emissiveIntensity = 0;
      }
      return;
    }

    const propState = gameState.properties[tile.id] || null;
    const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
    const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;
    const ownerColor = ownerTheme ? ownerTheme.colorHex : null;

    const frame = context.tileBorderFrames[tile.id];
    const topMat = mesh.userData?.topMat || (Array.isArray(mesh.material) ? mesh.material[2] : null);
    const sideMat = mesh.userData?.sideMat || (Array.isArray(mesh.material) ? mesh.material[0] : null);

    // Allow font emissive glow for owned tiles with emissiveMap in night/sunset modes
    if (topMat) {
      if (topMat.emissiveMap && isOwned && (isNightBulb || isSunsetBulb)) {
        const baseIntensity = isNightBulb ? 0.85 : 0.55;
        const fontNoise = Math.sin(t * 4.0 + tile.id * 1.7) * 0.04;
        topMat.emissive.setHex(0xffffff);
        topMat.emissiveIntensity = Math.max(0, baseIntensity * (1 + fontNoise));
      } else if (topMat.emissiveIntensity > 0) {
        topMat.emissive.setHex(0x000000);
        topMat.emissiveIntensity = 0;
      }
    }

    // Check if any active player is on this tile or currently landing on it
    const hasPlayer = (gameState.players && gameState.players.some(p => !p.bankrupt && p.position === tile.id)) || (movingHopDestTileId === tile.id);

    // Calculate press depth ratio (0 when at rest, 1.0 when fully depressed)
    const pressOffset = state2 ? state2.currentOffset : 0;
    const pressRatio = Math.min(1.0, Math.max(0, -pressOffset / 0.16));

    let targetIllum = 0;
    if (hasPlayer) {
      targetIllum = (0.20 + pressRatio * 0.80) * nightFactor;
    } else if (pressRatio > 0.05) {
      targetIllum = pressRatio * 0.40 * nightFactor;
    }

    illumData.currentIllum += (targetIllum - illumData.currentIllum) * 0.28;
    const illum = illumData.currentIllum;

    if (illum > maxIllumVal) {
      maxIllumVal = illum;
      maxIllumTileId = tile.id;
    }

    // 1. Illuminate Border in Owner Theme Accent for Bought Tiles
    if (isNightBulb && isOwned && ownerColor) {
      if (frame && frame.userData?.borderMat) {
        frame.visible = true;
        frame.userData.borderMat.color.setStyle(ownerColor);
        frame.userData.borderMat.emissive.setStyle(ownerColor);
        frame.userData.borderMat.emissiveIntensity = 0.85 + pressRatio * 0.60;
      }
      if (sideMat) {
        sideMat.color.setStyle(ownerColor);
        sideMat.emissive.setStyle(ownerColor);
        sideMat.emissiveIntensity = 0.50 + pressRatio * 0.35;
      }
    } else if (isSunsetBulb && isOwned && ownerColor) {
      if (frame && frame.userData?.borderMat) {
        frame.visible = true;
        frame.userData.borderMat.color.setStyle(ownerColor);
        frame.userData.borderMat.emissive.setStyle(ownerColor);
        frame.userData.borderMat.emissiveIntensity = 0.50 + pressRatio * 0.35;
      }
      if (sideMat) {
        sideMat.color.setStyle(ownerColor);
        sideMat.emissive.setStyle(ownerColor);
        sideMat.emissiveIntensity = 0.28 + pressRatio * 0.20;
      }
    } else if (isOwned && ownerColor) {
      // Day mode: keep 3D anodized satin frame visible and crisp across the board!
      if (frame && frame.userData?.borderMat) {
        frame.visible = true;
        frame.userData.borderMat.color.setStyle(ownerColor);
        frame.userData.borderMat.emissive.setStyle(ownerColor);
        frame.userData.borderMat.emissiveIntensity = 0.28 + pressRatio * 0.30;
      }
      if (sideMat) {
        sideMat.color.setStyle(ownerColor);
        sideMat.emissive.setStyle(ownerColor);
        sideMat.emissiveIntensity = 0.15 + pressRatio * 0.20;
      }
    } else {
      if (frame) frame.visible = false;
      if (sideMat) {
        if (pressRatio > 0.05 && nightFactor > 0.01) {
          sideMat.emissive.setHex(0xffeedd);
          sideMat.emissiveIntensity = pressRatio * 0.35;
        } else {
          sideMat.emissive.setHex(0x000000);
          sideMat.emissiveIntensity = 0;
        }
      }
    }

    // 2. Soft Ground Halo Light Pool (disabled per user requirement: no reflection effects)
    if (pool) {
      pool.visible = false;
      pool.material.opacity = 0;
    }
  });

  // 3. Dynamic Soft PointLight only on final resting touchdown or click
  if (context.tilePressPointLight) {
    if (maxIllumVal > 0.25 && maxIllumTileId !== null && gameState.phase !== 'MOVING' && nightFactor > 0.01) {
      const pos = getTileWorldPosition(maxIllumTileId);
      const pressOffset = context.activeTileDepressions[maxIllumTileId]?.currentOffset ?? 0;
      context.tilePressPointLight.position.set(pos.x, BASE_TILE_Y + 1.2 + pressOffset, pos.z);
      const propState = gameState.properties[maxIllumTileId] || null;
      const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
      const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;
      const lightCol = ownerTheme ? ownerTheme.colorHex : null;
      if (lightCol) {
        context.tilePressPointLight.color.setStyle(lightCol);
      } else {
        context.tilePressPointLight.color.setHex(0xffeedd);
      }
      context.tilePressPointLight.intensity = Math.min(0.40, maxIllumVal * 0.40);
      context.tilePressPointLight.visible = true;
    } else {
      context.tilePressPointLight.intensity = 0;
      context.tilePressPointLight.visible = false;
    }
  }
}
