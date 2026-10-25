/**
 * three/core/lighting/themes.js
 * Atmospheric bulb mode switching (day, sunset, night, cyberpunk), tile border emissives, and avatar lighting.
 */

import * as THREE from 'three';
import { context } from '../context.js';
import { BOARD_TILES, PLAYER_THEMES } from '../../../game/data.js';
import { gameState, matchSettings } from '../../../game/state.js';
import {
  currentBulbMode,
  currentBulbBoardStyle,
  setCurrentBulbMode,
  setCurrentBulbBoardStyle,
  streetBulbMaterials,
  streetFilamentMaterials,
  streetGlassMaterials,
  streetGlowSprites,
  streetGroundLightPools,
  streetLightBeams,
  streetPointLights,
  onLightingThemeChanged
} from './state.js';

/**
 * Tints a hex color into a softened pastel accent.
 */
export function getLightPlayerAccent(hex, amount = 0.40) {
  if (!hex || hex[0] !== '#') return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `rgb(${lr}, ${lg}, ${lb})`;
}

/**
 * Updates tile border emissive frames based on active day/sunset/night mode.
 */
export function updateTileBordersForCurrentMode() {
  const isNight = (currentBulbMode === 'night');
  const isSunset = (currentBulbMode === 'sunset');
  const boardStyle = matchSettings?.boardStyle || 'wood';
  const isCyber = (boardStyle === 'cyberpunk');
  const isElegant = (boardStyle === 'elegant');

  const unownedSideColor = isCyber
    ? new THREE.Color(0x0b1220)
    : (isElegant ? new THREE.Color(0xfafaf9) : new THREE.Color(0xe2e8f0));

  const roughness = isCyber ? 0.28 : (isElegant ? 0.18 : 0.42);
  const metalness = isCyber ? 0.85 : (isElegant ? 0.25 : 0.04);

  BOARD_TILES.forEach(tile => {
    const frame = context.tileBorderFrames[tile.id];
    const mesh = context.tilesMeshMap[tile.id];
    const propState = gameState.properties[tile.id] || null;
    const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
    const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;
    const lightPlayerAccent = ownerTheme ? getLightPlayerAccent(ownerTheme.colorHex, 0.40) : null;

    if (Array.isArray(mesh?.material)) {
      [0, 1, 3, 4, 5].forEach(idx => {
        if (mesh.material[idx]) {
          mesh.material[idx].roughness = roughness;
          mesh.material[idx].metalness = metalness;
          if (isOwned && lightPlayerAccent) {
            mesh.material[idx].color.setStyle(lightPlayerAccent);
            if (isNight) {
              mesh.material[idx].emissive.setStyle(lightPlayerAccent);
              mesh.material[idx].emissiveIntensity = 0.50;
            } else if (isSunset) {
              mesh.material[idx].emissive.setStyle(lightPlayerAccent);
              mesh.material[idx].emissiveIntensity = 0.25;
            } else {
              mesh.material[idx].emissive.setHex(0x000000);
              mesh.material[idx].emissiveIntensity = 0;
            }
          } else {
            mesh.material[idx].color.copy(unownedSideColor);
            if (isCyber && (isNight || isSunset)) {
              mesh.material[idx].emissive.setHex(0x002233);
              mesh.material[idx].emissiveIntensity = 0.20;
            } else {
              mesh.material[idx].emissive.setHex(0x000000);
              mesh.material[idx].emissiveIntensity = 0;
            }
          }
          mesh.material[idx].needsUpdate = true;
        }
      });
    }

    if (frame && frame.userData?.borderMat) {
      if (isOwned && lightPlayerAccent) {
        frame.userData.borderMat.color.setStyle(lightPlayerAccent);
        frame.userData.borderMat.emissive.setStyle(lightPlayerAccent);
        if (isNight) {
          frame.visible = true;
          frame.userData.borderMat.emissiveIntensity = 0.85;
        } else if (isSunset) {
          frame.visible = true;
          frame.userData.borderMat.emissiveIntensity = 0.45;
        } else {
          frame.visible = false;
          frame.userData.borderMat.emissiveIntensity = 0;
        }
      } else if (isCyber && (isNight || isSunset)) {
        frame.visible = true;
        frame.userData.borderMat.color.setHex(0x00f5ff);
        frame.userData.borderMat.emissive.setHex(0x00f5ff);
        frame.userData.borderMat.emissiveIntensity = isNight ? 0.65 : 0.35;
      } else {
        frame.visible = false;
        frame.userData.borderMat.emissiveIntensity = 0;
      }
    }
  });
}

/**
 * Updates avatar token lighting and ground auras based on active day/sunset/night mode.
 */
export function updateAvatarLightingForCurrentMode() {
  const isNight = (currentBulbMode === 'night');
  const isSunset = (currentBulbMode === 'sunset');
  context.playerMeshes.forEach(mesh => {
    const ud = mesh?.userData;
    if (!ud) return;
    if (isNight) {
      if (ud.avatarLight) ud.avatarLight.intensity = 1.4;
      if (ud.groundAura) ud.groundAura.material.opacity = 0.45;
      if (ud.suitMat) { ud.suitMat.emissive.setHex(ud.themeColor); ud.suitMat.emissiveIntensity = 0.35; }
    } else if (isSunset) {
      if (ud.avatarLight) ud.avatarLight.intensity = 0.65;
      if (ud.groundAura) ud.groundAura.material.opacity = 0.22;
      if (ud.suitMat) { ud.suitMat.emissive.setHex(ud.themeColor); ud.suitMat.emissiveIntensity = 0.18; }
    } else {
      if (ud.avatarLight) ud.avatarLight.intensity = 0.0;
      if (ud.groundAura) ud.groundAura.material.opacity = 0.0;
      if (ud.suitMat) { ud.suitMat.emissive.setHex(0x000000); ud.suitMat.emissiveIntensity = 0.0; }
    }
  });
}

/**
 * Applies lighting mode changes: 'day', 'sunset', or 'night', tailored to the active board style.
 * Adjusts street lamps, filaments, glowing bulbs, ground pools, avatar auras, and tile borders.
 */
export function setBulbLightingTheme(mode, boardStyle = matchSettings?.boardStyle || 'wood') {
  setCurrentBulbMode(mode);
  setCurrentBulbBoardStyle(boardStyle);
  const isNight = (mode === 'night');
  const isSunset = (mode === 'sunset');
  const isCyber = (boardStyle === 'cyberpunk');
  const isElegant = (boardStyle === 'elegant');

  if (isCyber) {
    // Cyberpunk board style features high-intensity neon cyan illumination in all modes
    streetFilamentMaterials.forEach(mat => mat.color.setHex(0x38bdf8));
    streetBulbMaterials.forEach(mat => {
      mat.emissive.setHex(0x00f5ff);
      mat.emissiveIntensity = 2.2;
      mat.opacity = 0.95;
    });
    streetGlassMaterials.forEach(mat => {
      mat.emissive.setHex(0x0284c7);
      mat.emissiveIntensity = 0.35;
      mat.opacity = 0.35;
    });
    streetGlowSprites.forEach(mat => {
      mat.color.setHex(0x38bdf8);
      mat.opacity = 0.70;
      mat.visible = true;
    });
    streetGroundLightPools.forEach(mat => {
      mat.color.setHex(0x00f5ff);
      mat.opacity = 0.45;
      mat.visible = true;
    });
    streetLightBeams.forEach(mat => {
      mat.color.setHex(0x38bdf8);
      mat.opacity = 0.22;
      mat.visible = true;
    });
    streetPointLights.forEach(pl => {
      pl.visible = true;
      pl.color.setHex(0x00f5ff);
      pl.intensity = 1.6;
      pl.distance = 7.5;
      pl.decay = 1.6;
    });
  } else if (isElegant) {
    if (isNight) {
      streetFilamentMaterials.forEach(mat => mat.color.setHex(0xffd700));
      streetBulbMaterials.forEach(mat => {
        mat.emissive.setHex(0xffd700);
        mat.emissiveIntensity = 2.6;
        mat.opacity = 0.92;
      });
      streetGlassMaterials.forEach(mat => {
        mat.emissive.setHex(0xfef08a);
        mat.emissiveIntensity = 0.35;
        mat.opacity = 0.40;
      });
      streetGlowSprites.forEach(mat => {
        mat.color.setHex(0xfef08a);
        mat.opacity = 0.70;
        mat.visible = true;
      });
      streetGroundLightPools.forEach(mat => {
        mat.color.setHex(0xffd700);
        mat.opacity = 0.45;
        mat.visible = true;
      });
      streetLightBeams.forEach(mat => {
        mat.color.setHex(0xfef08a);
        mat.opacity = 0.08;
        mat.visible = true;
      });
      streetPointLights.forEach(pl => {
        pl.visible = true;
        pl.color.setHex(0xffd700);
        pl.intensity = 1.5;
        pl.distance = 7.5;
        pl.decay = 1.8;
      });
    } else if (isSunset) {
      streetFilamentMaterials.forEach(mat => mat.color.setHex(0xfde047));
      streetBulbMaterials.forEach(mat => {
        mat.emissive.setHex(0xfacc15);
        mat.emissiveIntensity = 2.2;
        mat.opacity = 0.90;
      });
      streetGlassMaterials.forEach(mat => {
        mat.emissive.setHex(0xfde047);
        mat.emissiveIntensity = 0.25;
        mat.opacity = 0.35;
      });
      streetGlowSprites.forEach(mat => {
        mat.color.setHex(0xfde047);
        mat.opacity = 0.55;
        mat.visible = true;
      });
      streetGroundLightPools.forEach(mat => {
        mat.color.setHex(0xfde047);
        mat.opacity = 0.32;
        mat.visible = true;
      });
      streetLightBeams.forEach(mat => {
        mat.color.setHex(0xfde047);
        mat.opacity = 0.06;
        mat.visible = true;
      });
      streetPointLights.forEach(pl => {
        pl.visible = true;
        pl.color.setHex(0xfacc15);
        pl.intensity = 1.2;
        pl.distance = 6.5;
        pl.decay = 1.8;
      });
    } else {
      // Elegant board daytime / morning: streetlights extinguished
      streetFilamentMaterials.forEach(mat => mat.color.setHex(0x475569));
      streetBulbMaterials.forEach(mat => {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
        mat.opacity = 0.35;
      });
      streetGlassMaterials.forEach(mat => {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
        mat.opacity = 0.20;
      });
      streetGlowSprites.forEach(mat => {
        mat.opacity = 0.0;
        mat.visible = false;
      });
      streetGroundLightPools.forEach(mat => {
        mat.opacity = 0.0;
        mat.visible = false;
      });
      streetLightBeams.forEach(mat => {
        mat.opacity = 0.0;
        mat.visible = false;
      });
      streetPointLights.forEach(pl => {
        pl.visible = false;
        pl.intensity = 0.0;
      });
    }
  } else {
    // Default: 'wood' (Normal board)
    if (isNight) {
      streetFilamentMaterials.forEach(mat => mat.color.setHex(0xffffff));
      streetBulbMaterials.forEach(mat => {
        mat.emissive.setHex(0xffeedd);
        mat.emissiveIntensity = 2.6;
        mat.opacity = 0.92;
      });
      streetGlassMaterials.forEach(mat => {
        mat.emissive.setHex(0xffeedd);
        mat.emissiveIntensity = 0.35;
        mat.opacity = 0.42;
      });
      streetGlowSprites.forEach(mat => {
        mat.color.setHex(0xfffaed);
        mat.opacity = 0.70;
        mat.visible = true;
      });
      streetGroundLightPools.forEach(mat => {
        mat.color.setHex(0xffeedd);
        mat.opacity = 0.45;
        mat.visible = true;
      });
      streetLightBeams.forEach(mat => {
        mat.color.setHex(0xfffaed);
        mat.opacity = 0.08;
        mat.visible = true;
      });
      streetPointLights.forEach(pl => {
        pl.visible = true;
        pl.color.setHex(0xffeedd);
        pl.intensity = 1.5;
        pl.distance = 7.5;
        pl.decay = 1.8;
      });
    } else if (isSunset) {
      streetFilamentMaterials.forEach(mat => mat.color.setHex(0xffedd5));
      streetBulbMaterials.forEach(mat => {
        mat.emissive.setHex(0xffe29a);
        mat.emissiveIntensity = 2.0;
        mat.opacity = 0.88;
      });
      streetGlassMaterials.forEach(mat => {
        mat.emissive.setHex(0xffe29a);
        mat.emissiveIntensity = 0.25;
        mat.opacity = 0.35;
      });
      streetGlowSprites.forEach(mat => {
        mat.color.setHex(0xffe29a);
        mat.opacity = 0.55;
        mat.visible = true;
      });
      streetGroundLightPools.forEach(mat => {
        mat.color.setHex(0xffe29a);
        mat.opacity = 0.30;
        mat.visible = true;
      });
      streetLightBeams.forEach(mat => {
        mat.color.setHex(0xffe29a);
        mat.opacity = 0.06;
        mat.visible = true;
      });
      streetPointLights.forEach(pl => {
        pl.visible = true;
        pl.color.setHex(0xffe29a);
        pl.intensity = 1.1;
        pl.distance = 6.0;
        pl.decay = 1.8;
      });
    } else {
      // Normal wood board daytime / morning: streetlights extinguished, clean natural daylight
      streetFilamentMaterials.forEach(mat => mat.color.setHex(0x475569));
      streetBulbMaterials.forEach(mat => {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
        mat.opacity = 0.35;
      });
      streetGlassMaterials.forEach(mat => {
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0.0;
        mat.opacity = 0.20;
      });
      streetGlowSprites.forEach(mat => {
        mat.opacity = 0.0;
        mat.visible = false;
      });
      streetGroundLightPools.forEach(mat => {
        mat.opacity = 0.0;
        mat.visible = false;
      });
      streetLightBeams.forEach(mat => {
        mat.opacity = 0.0;
        mat.visible = false;
      });
      streetPointLights.forEach(pl => {
        pl.visible = false;
        pl.intensity = 0.0;
      });
    }
  }

  updateAvatarLightingForCurrentMode();
  updateTileBordersForCurrentMode();

  if (context.tilePressPointLight) {
    context.tilePressPointLight.intensity = 0;
    context.tilePressPointLight.visible = false;
  }
  if (!isNight && !isSunset && !isCyber) {
    Object.values(context.tileGroundLightPools).forEach(pool => {
      if (pool) { pool.visible = false; pool.material.opacity = 0; }
    });
    Object.values(context.tilesMeshMap).forEach(mesh => {
      const topMat = mesh?.userData?.topMat || (Array.isArray(mesh?.material) ? mesh.material[2] : null);
      const sideMat = mesh?.userData?.sideMat || (Array.isArray(mesh?.material) ? mesh.material[0] : null);
      if (topMat) { topMat.emissive.setHex(0x000000); topMat.emissiveIntensity = 0; }
      if (sideMat) { sideMat.emissive.setHex(0x000000); sideMat.emissiveIntensity = 0; }
    });
    Object.keys(context.activeTileIlluminations).forEach(k => {
      context.activeTileIlluminations[k].currentIllum = 0;
    });
  }

  if (typeof onLightingThemeChanged === 'function') {
    onLightingThemeChanged(mode);
  }
}

/**
 * Returns active lighting references for UI toggles and effects.
 */
export function getSceneLighting() {
  return {
    ambientLight: context.ambientLight,
    dirLight: context.dirLight,
    hemiLight: context.hemiLight,
    setBulbLightingTheme
  };
}
