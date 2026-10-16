/**
 * three/board/tiles.js
 * Board tile blocks:
 * - Canvas 2D texture generation for city deeds, colors, rents, and flags.
 * - Procedural bevel borders and illuminated glass frames.
 * - Building group placement and dynamic upgrade tier switching (Flag, Cottages, Skyscrapers).
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { BOARD_TILES, PLAYER_THEMES } from '../../game/data.js';
import { gameState, matchSettings } from '../../game/state.js';
import { getTileWorldPosition, BASE_TILE_Y, BASE_BUILDING_Y } from './coords.js';
import { currentBulbMode, getLightPlayerAccent, getGroundPoolTexture } from '../core/lighting.js';
import {
  createDetailedFlagMesh,
  createDetailedHouseMesh,
  createDetailedSkyscraperMesh,
  animatedBuildingPopups
} from '../assets/buildings.js';
import { disposeHierarchy } from '../core/dispose.js';
import { updateDioramaCenterForEdition } from './diorama.js';
import { generateTileSvg, drawSvgToCanvas } from './tileSvg.js';

/**
 * Renders a crisp vector texture for a tile using declarative SVG templates.
 * Conforms to Clean Code SRP: Presentation is decoupled into tileSvg.js.
 * @param {object} tile - Tile definition object
 * @param {object} propState - Dynamic property ownership and mortgage state
 * @returns {THREE.CanvasTexture}
 */
export function createTileTexture(tile, propState) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  // Immediate solid background for seamless zero-flicker frame-0 render
  const boardStyle = matchSettings.boardStyle || 'wood';
  const isCyber = (boardStyle === 'cyberpunk');
  const isElegant = (boardStyle === 'elegant');
  ctx.fillStyle = isCyber ? '#080d1a' : (isElegant ? '#fafaf9' : '#ffffff');
  ctx.fillRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = context.maxAnisotropy;
  tex.needsUpdate = true;

  // Generate declarative SVG vector document and rasterize to canvas
  const svgMarkup = generateTileSvg(tile, propState);
  drawSvgToCanvas(svgMarkup, c, () => {
    tex.needsUpdate = true;
  });

  return tex;
}

export function createTileBorderFrame(colorHex) {
  const frameGroup = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    emissive: new THREE.Color(colorHex),
    emissiveIntensity: 0.30,
    roughness: 0.28,
    metalness: 0.35,
    transparent: true,
    opacity: 0.96
  });

  const rimW = 2.96;
  const rimThick = 0.14;
  const rimH = 0.045;

  const barNSGeo = new THREE.BoxGeometry(rimW, rimH, rimThick);
  const barN = new THREE.Mesh(barNSGeo, mat);
  barN.position.set(0, 0.125, -(rimW - rimThick) / 2);
  const barS = new THREE.Mesh(barNSGeo, mat);
  barS.position.set(0, 0.125, (rimW - rimThick) / 2);

  const barEWGeo = new THREE.BoxGeometry(rimThick, rimH, rimW - rimThick * 2);
  const barE = new THREE.Mesh(barEWGeo, mat);
  barE.position.set((rimW - rimThick) / 2, 0.125, 0);
  const barW = new THREE.Mesh(barEWGeo, mat);
  barW.position.set(-(rimW - rimThick) / 2, 0.125, 0);

  frameGroup.add(barN, barS, barE, barW);
  frameGroup.userData = { borderMat: mat };
  return frameGroup;
}

export function buildAllBoardTiles3D(boardGroup) {
  context.tilesMeshMap = {};
  context.tileBuildingGroups = {};
  context.activeTileDepressions = {};
  context.tileGroundLightPools = {};
  context.activeTileIlluminations = {};
  context.tileBorderFrames = {};

  BOARD_TILES.forEach(tile => {
    const pos = getTileWorldPosition(tile.id);
    const propState = gameState.properties[tile.id] || null;
    const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
    const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;
    const lightPlayerAccent = ownerTheme ? getLightPlayerAccent(ownerTheme.colorHex, 0.40) : null;
    const boardStyle = matchSettings.boardStyle || 'wood';
    const isCyber = (boardStyle === 'cyberpunk');
    const isElegant = (boardStyle === 'elegant');

    const sideColor = isOwned
      ? new THREE.Color(ownerTheme.colorHex)
      : (isCyber ? new THREE.Color(0x0b1220) : (isElegant ? new THREE.Color(0xfafaf9) : new THREE.Color(0xe2e8f0)));

    const sideMat = new THREE.MeshStandardMaterial({
      color: sideColor,
      roughness: isCyber ? 0.28 : (isElegant ? 0.18 : 0.42),
      metalness: isCyber ? 0.85 : (isElegant ? 0.25 : 0.04)
    });
    const topTex = createTileTexture(tile, propState);
    const topMat = new THREE.MeshStandardMaterial({
      map: topTex,
      color: 0xffffff,
      roughness: isCyber ? 0.20 : (isElegant ? 0.15 : 0.28),
      metalness: isCyber ? 0.15 : (isElegant ? 0.08 : 0.02)
    });
    const materials = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
    const tileMesh = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.24, 2.96), materials);
    tileMesh.position.set(pos.x, BASE_TILE_Y, pos.z);
    tileMesh.receiveShadow = true;
    tileMesh.castShadow = true;
    tileMesh.userData = { tileId: tile.id, topMat, sideMat };

    const borderFrame = createTileBorderFrame(ownerTheme ? ownerTheme.colorHex : '#e2e8f0');
    borderFrame.visible = !!isOwned;
    tileMesh.add(borderFrame);
    context.tileBorderFrames[tile.id] = borderFrame;

    boardGroup.add(tileMesh);
    context.tilesMeshMap[tile.id] = tileMesh;

    const poolGeo = new THREE.PlaneGeometry(4.8, 4.8);
    const poolMat = new THREE.MeshBasicMaterial({
      map: getGroundPoolTexture(),
      color: ownerTheme ? new THREE.Color(ownerTheme.colorHex) : 0xffeedd,
      transparent: true,
      opacity: isOwned ? 0.26 : 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const groundPool = new THREE.Mesh(poolGeo, poolMat);
    groundPool.rotation.x = -Math.PI / 2;
    groundPool.position.set(pos.x, 0.04, pos.z);
    groundPool.visible = !!isOwned;
    boardGroup.add(groundPool);
    context.tileGroundLightPools[tile.id] = groundPool;

    const bGroup = new THREE.Group();
    bGroup.position.set(pos.x, BASE_BUILDING_Y, pos.z);
    if (pos.side === 1) bGroup.rotation.y = -Math.PI / 2;
    else if (pos.side === 2) bGroup.rotation.y = Math.PI;
    else if (pos.side === 3) bGroup.rotation.y = Math.PI / 2;
    bGroup.userData = { tileId: tile.id };
    boardGroup.add(bGroup);
    context.tileBuildingGroups[tile.id] = bGroup;
    context.activeTileDepressions[tile.id] = { currentOffset: 0, targetOffset: 0 };
    context.activeTileIlluminations[tile.id] = { currentIllum: 0 };
  });

  if (!context.tilePressPointLight) {
    context.tilePressPointLight = new THREE.PointLight(0xffeedd, 0, 7.5, 1.8);
    context.tilePressPointLight.position.set(0, 1.2, 0);
    context.tilePressPointLight.visible = false;
    boardGroup.add(context.tilePressPointLight);
  }
}

/**
 * Updates an individual tile's 2D canvas texture and placed 3D building model (Flag / House / Skyscraper).
 * @param {number} tileId
 */
export function refreshTileTextureAndBuildings(tileId) {
  const tile = BOARD_TILES[tileId];
  const mesh = context.tilesMeshMap[tileId];
  if (!tile || !mesh) return;

  const propState = gameState.properties[tileId] || null;
  const newTex = createTileTexture(tile, propState);
  if (Array.isArray(mesh.material) && mesh.material[2]) {
    if (mesh.material[2].map) mesh.material[2].map.dispose();
    mesh.material[2].map = newTex;
    mesh.material[2].needsUpdate = true;
  }

  const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
  const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;
  const lightPlayerAccent = ownerTheme ? getLightPlayerAccent(ownerTheme.colorHex, 0.40) : null;

  const boardStyle = matchSettings.boardStyle || 'wood';
  const isCyber = (boardStyle === 'cyberpunk');
  const isElegant = (boardStyle === 'elegant');

  const sideColor = isOwned
    ? new THREE.Color(ownerTheme.colorHex)
    : (isCyber ? new THREE.Color(0x0b1220) : (isElegant ? new THREE.Color(0xfafaf9) : new THREE.Color(0xe2e8f0)));

  const isNight = (currentBulbMode === 'night');
  const isSunset = (currentBulbMode === 'sunset');

  if (Array.isArray(mesh.material)) {
    [0, 1, 3, 4, 5].forEach(idx => {
      if (mesh.material[idx]) {
        mesh.material[idx].color.copy(sideColor);
        mesh.material[idx].roughness = isCyber ? 0.28 : (isElegant ? 0.18 : 0.42);
        mesh.material[idx].metalness = isCyber ? 0.85 : (isElegant ? 0.25 : 0.04);
        if (isOwned && isNight && ownerTheme) {
          mesh.material[idx].emissive.setStyle(ownerTheme.colorHex);
          mesh.material[idx].emissiveIntensity = 0.50;
        } else if (isOwned && isSunset && ownerTheme) {
          mesh.material[idx].emissive.setStyle(ownerTheme.colorHex);
          mesh.material[idx].emissiveIntensity = 0.25;
        } else {
          mesh.material[idx].emissive.setHex(0x000000);
          mesh.material[idx].emissiveIntensity = 0;
        }
        mesh.material[idx].needsUpdate = true;
      }
    });
  }

  const frame = context.tileBorderFrames[tileId];
  if (frame && frame.userData?.borderMat) {
    if (isOwned && ownerTheme) {
      frame.visible = true;
      frame.userData.borderMat.color.setStyle(ownerTheme.colorHex);
      frame.userData.borderMat.emissive.setStyle(ownerTheme.colorHex);
      if (isNight) {
        frame.userData.borderMat.emissiveIntensity = 0.85;
      } else if (isSunset) {
        frame.userData.borderMat.emissiveIntensity = 0.50;
      } else {
        frame.userData.borderMat.emissiveIntensity = 0.28;
      }
    } else {
      frame.visible = false;
      frame.userData.borderMat.emissiveIntensity = 0;
    }
  }

  const pool = context.tileGroundLightPools[tileId];
  if (pool && pool.material) {
    if (isOwned && ownerTheme) {
      pool.visible = true;
      pool.material.color.setStyle(ownerTheme.colorHex);
      pool.material.opacity = isNight ? 0.45 : (isSunset ? 0.35 : 0.25);
    } else {
      pool.visible = false;
      pool.material.opacity = 0;
    }
  }

  if ([0, 8, 16, 24].includes(tileId)) return;

  const bGroup = context.tileBuildingGroups[tileId];
  if (!bGroup) return;
  while (bGroup.children.length > 0) {
    const child = bGroup.children[0];
    disposeHierarchy(child);
    bGroup.remove(child);
  }
  if (!propState || propState.owner === null || propState.mortgaged) return;

  const pos = getTileWorldPosition(tileId);
  if (pos.side === 1) bGroup.rotation.y = -Math.PI / 2;
  else if (pos.side === 2) bGroup.rotation.y = Math.PI;
  else if (pos.side === 3) bGroup.rotation.y = Math.PI / 2;
  else bGroup.rotation.y = 0;

  const ownerColor = PLAYER_THEMES[propState.owner]?.charColor ?? 0x6366f1;
  const lvl = propState.level || 0;

  if (lvl === 0) {
    const flagMesh = createDetailedFlagMesh(ownerColor);
    // Position flag in corner sidewalk so it never occludes card text
    flagMesh.position.set(0.95, 0, -0.92);
    flagMesh.scale.set(0.01, 0.01, 0.01);
    bGroup.add(flagMesh);
    animatedBuildingPopups.push({ mesh: flagMesh, startTime: performance.now(), duration: 400 });
  } else if (lvl >= 1 && lvl <= 3) {
    const hGroup = createDetailedHouseMesh(ownerColor, lvl);
    hGroup.position.set(0, 0, -0.88);
    hGroup.scale.set(0.01, 0.01, 0.01);
    bGroup.add(hGroup);
    animatedBuildingPopups.push({ mesh: hGroup, startTime: performance.now(), duration: 420 });
  } else if (lvl >= 4) {
    const towerGroup = createDetailedSkyscraperMesh(ownerColor);
    towerGroup.position.set(0, 0, -0.85);
    towerGroup.scale.set(0.01, 0.01, 0.01);
    bGroup.add(towerGroup);
    animatedBuildingPopups.push({ mesh: towerGroup, startTime: performance.now(), duration: 500 });
  }
}

export const updateTileMesh = refreshTileTextureAndBuildings;

/**
 * Refreshes textures, side colors, and materials on all 32 tiles simultaneously.
 */
export function refreshAllTileTexturesAndMaterials() {
  BOARD_TILES.forEach(tile => {
    refreshTileTextureAndBuildings(tile.id);
  });
  updateDioramaCenterForEdition(matchSettings?.boardEdition || 'world');
}
