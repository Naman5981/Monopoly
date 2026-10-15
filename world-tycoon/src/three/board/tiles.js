/**
 * three/board/tiles.js
 * Board tile blocks:
 * - Canvas 2D texture generation for city deeds, colors, rents, and flags.
 * - Procedural bevel borders and illuminated glass frames.
 * - Building group placement and dynamic upgrade tier switching (Flag, Cottages, Skyscrapers).
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { BOARD_TILES, GROUP_META, PLAYER_THEMES } from '../../game/data.js';
import { gameState, matchSettings } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { calculateTileRent } from '../../game/rules.js';
import { getTileWorldPosition, BASE_TILE_Y, BASE_BUILDING_Y } from './coords.js';
import { currentBulbMode, getLightPlayerAccent, getGroundPoolTexture } from '../core/lighting.js';
import {
  createDetailedFlagMesh,
  createDetailedHouseMesh,
  createDetailedSkyscraperMesh,
  animatedBuildingPopups
} from '../assets/buildings.js';
import { disposeHierarchy } from '../core/dispose.js';

/**
 * Renders an offscreen canvas texture for a specific tile.
 * @param {object} tile - Tile definition object
 * @param {object} propState - Dynamic property ownership and mortgage state
 * @returns {THREE.CanvasTexture}
 */
export function createTileTexture(tile, propState) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');

  const boardStyle = matchSettings.boardStyle || 'wood';
  const isCyber = (boardStyle === 'cyberpunk');
  const isElegant = (boardStyle === 'elegant');

  // Background fill
  if (isCyber) {
    ctx.fillStyle = propState?.mortgaged ? '#0e1726' : '#080d1a';
  } else if (isElegant) {
    ctx.fillStyle = propState?.mortgaged ? '#f1f5f9' : '#fafaf9';
  } else {
    ctx.fillStyle = propState?.mortgaged ? '#e2e8f0' : '#ffffff';
  }
  ctx.fillRect(0, 0, 512, 512);

  const isOwned = propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner];
  const ownerTheme = isOwned ? PLAYER_THEMES[propState.owner] : null;
  const lightPlayerAccent = ownerTheme ? getLightPlayerAccent(ownerTheme.colorHex, 0.40) : null;

  if (isOwned) {
    ctx.strokeStyle = lightPlayerAccent;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 498, 498);

    ctx.fillStyle = isCyber ? 'rgba(0, 245, 255, 0.25)' : (isElegant ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.85)');
    ctx.fillRect(14, 14, 484, 8);
    ctx.fillRect(14, 14, 8, 484);

    ctx.fillStyle = isCyber ? 'rgba(0, 0, 0, 0.6)' : 'rgba(15, 23, 42, 0.22)';
    ctx.fillRect(14, 490, 484, 8);
    ctx.fillRect(490, 14, 8, 484);

    ctx.strokeStyle = ownerTheme.colorHex;
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 472, 472);
  } else {
    if (isCyber) {
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 10;
      ctx.strokeRect(7, 7, 498, 498);

      ctx.strokeStyle = '#d946ef';
      ctx.lineWidth = 3;
      ctx.strokeRect(16, 16, 480, 480);
    } else if (isElegant) {
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 12;
      ctx.strokeRect(7, 7, 498, 498);

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.strokeRect(16, 16, 480, 480);
    } else {
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 498, 498);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(14, 14, 484, 8);
      ctx.fillRect(14, 14, 8, 484);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.fillRect(14, 490, 484, 8);
      ctx.fillRect(490, 14, 8, 484);

      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 472, 472);
    }
  }

  const pos = getTileWorldPosition(tile.id);
  ctx.save();
  ctx.translate(256, 256);
  if (pos.side === 1) ctx.rotate(Math.PI / 2);
  if (pos.side === 2) ctx.rotate(Math.PI);
  if (pos.side === 3) ctx.rotate(-Math.PI / 2);
  ctx.translate(-256, -256);

  if (tile.type === 'city' && tile.group) {
    ctx.fillStyle = GROUP_META[tile.group].hex;
    ctx.fillRect(12, 12, 488, 106);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.fillRect(12, 12, 488, 10);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(12, 118, 488, 6);
    if (propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner]) {
      ctx.fillStyle = PLAYER_THEMES[propState.owner].colorHex;
      ctx.fillRect(12, 464, 488, 36);
    }
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (tile.type === 'city') {
    const fontSize = tile.name.length > 10 ? 42 : (tile.name.length > 7 ? 48 : 56);
    ctx.font = `900 ${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
    ctx.fillText(tile.name, 256, 215);

    const displayAmt = (propState?.owner !== null && propState?.owner !== undefined && !propState?.mortgaged)
      ? calculateTileRent(tile.id)
      : tile.price;
    ctx.font = '900 94px Inter, sans-serif';
    ctx.fillStyle = (propState?.owner !== null && propState?.owner !== undefined)
      ? (isCyber ? '#38bdf8' : '#047857')
      : (isCyber ? '#00f5ff' : '#0f172a');
    ctx.fillText(fmtMoney(displayAmt), 256, 375);

    if (propState?.festivalBoost) {
      ctx.fillStyle = isCyber ? '#ec4899' : '#6d28d9';
      ctx.font = '900 34px Inter, sans-serif';
      ctx.fillText('★ 2X RENT ★', 256, 286);
    }
  } else if (tile.type === 'chance') {
    const colors = ['#ef4444', '#facc15', '#22c55e', '#38bdf8', '#a855f7', '#fb923c'];
    const cx2 = 256, cy2 = 200, r = 110;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(cx2, cy2);
      ctx.arc(cx2, cy2, r, (i * Math.PI) / 3, ((i + 1) * Math.PI) / 3);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();
      ctx.strokeStyle = isCyber ? '#00f5ff' : '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
    ctx.font = '900 54px Inter, sans-serif';
    ctx.fillText('CHANCE', 256, 405);
  } else if (tile.type === 'tax') {
    ctx.fillStyle = isCyber ? '#111827' : '#f1f5f9';
    ctx.strokeStyle = isCyber ? '#ec4899' : '#64748b';
    ctx.lineWidth = 6;
    ctx.fillRect(166, 70, 180, 190);
    ctx.strokeRect(166, 70, 180, 190);
    ctx.fillStyle = '#dc2626';
    ctx.font = '900 84px Inter, sans-serif';
    ctx.fillText('%', 256, 170);
    ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
    ctx.font = '900 62px Inter, sans-serif';
    ctx.fillText('TAX', 256, 345);
    ctx.font = '800 46px Inter, sans-serif';
    ctx.fillStyle = '#dc2626';
    ctx.fillText(`-${fmtMoney(tile.amount)}`, 256, 425);
  } else if (tile.type === 'resort') {
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(12, 12, 488, 90);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.fillRect(12, 12, 488, 10);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(12, 102, 488, 6);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px Inter, sans-serif';
    ctx.fillText('RESORT', 256, 58);
    ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
    const resortFontSize = tile.name.length > 8 ? 44 : 52;
    ctx.font = `900 ${resortFontSize}px Inter, sans-serif`;
    ctx.fillText(tile.name, 256, 210);

    const isOwnedResort = (propState?.owner !== null && propState?.owner !== undefined && !propState?.mortgaged);
    const displayAmt = isOwnedResort ? calculateTileRent(tile.id) : tile.price;
    ctx.font = '900 90px Inter, sans-serif';
    ctx.fillStyle = isOwnedResort ? (isCyber ? '#38bdf8' : '#047857') : (isCyber ? '#00f5ff' : '#0f172a');
    ctx.fillText(fmtMoney(displayAmt), 256, 380);

    if (propState?.owner !== null && propState?.owner !== undefined && gameState.players[propState.owner]) {
      ctx.fillStyle = PLAYER_THEMES[propState.owner].colorHex;
      ctx.fillRect(12, 464, 488, 36);
    }
  } else {
    ctx.fillStyle = isCyber ? '#ffffff' : '#0f172a';
    ctx.font = '900 54px Inter, sans-serif';
    ctx.fillText(tile.name, 256, 395);
    ctx.fillStyle = isCyber ? '#94a3b8' : '#334155';
    ctx.font = '800 34px Inter, sans-serif';
    ctx.fillText(tile.subtitle || '', 256, 452);
  }

  if (propState?.mortgaged) {
    ctx.fillStyle = 'rgba(225, 29, 72, 0.94)';
    ctx.fillRect(26, 215, 460, 92);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.strokeRect(26, 215, 460, 92);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px Inter, sans-serif';
    ctx.fillText('MORTGAGED', 256, 262);
  }

  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = context.maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createTileBorderFrame(colorHex) {
  const frameGroup = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    emissive: new THREE.Color(colorHex),
    emissiveIntensity: 0.85,
    roughness: 0.15,
    metalness: 0.25,
    transparent: true,
    opacity: 0.92
  });

  const rimW = 2.96;
  const rimThick = 0.10;
  const rimH = 0.024;

  const barNSGeo = new THREE.BoxGeometry(rimW, rimH, rimThick);
  const barN = new THREE.Mesh(barNSGeo, mat);
  barN.position.set(0, 0.121, -(rimW - rimThick) / 2);
  const barS = new THREE.Mesh(barNSGeo, mat);
  barS.position.set(0, 0.121, (rimW - rimThick) / 2);

  const barEWGeo = new THREE.BoxGeometry(rimThick, rimH, rimW - rimThick * 2);
  const barE = new THREE.Mesh(barEWGeo, mat);
  barE.position.set((rimW - rimThick) / 2, 0.121, 0);
  const barW = new THREE.Mesh(barEWGeo, mat);
  barW.position.set(-(rimW - rimThick) / 2, 0.121, 0);

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
      ? new THREE.Color(lightPlayerAccent)
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

    const borderFrame = createTileBorderFrame(lightPlayerAccent || '#e2e8f0');
    borderFrame.visible = false;
    tileMesh.add(borderFrame);
    context.tileBorderFrames[tile.id] = borderFrame;

    boardGroup.add(tileMesh);
    context.tilesMeshMap[tile.id] = tileMesh;

    const poolGeo = new THREE.PlaneGeometry(4.8, 4.8);
    const poolMat = new THREE.MeshBasicMaterial({
      map: getGroundPoolTexture(),
      color: 0xffeedd,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const groundPool = new THREE.Mesh(poolGeo, poolMat);
    groundPool.rotation.x = -Math.PI / 2;
    groundPool.position.set(pos.x, 0.04, pos.z);
    groundPool.visible = false;
    boardGroup.add(groundPool);
    context.tileGroundLightPools[tile.id] = groundPool;

    const bGroup = new THREE.Group();
    bGroup.position.set(pos.x, BASE_BUILDING_Y, pos.z);
    if (pos.side === 1) bGroup.rotation.y = -Math.PI / 2;
    else if (pos.side === 2) bGroup.rotation.y = Math.PI;
    else if (pos.side === 3) bGroup.rotation.y = Math.PI / 2;
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
    ? new THREE.Color(lightPlayerAccent)
    : (isCyber ? new THREE.Color(0x0b1220) : (isElegant ? new THREE.Color(0xfafaf9) : new THREE.Color(0xe2e8f0)));

  const isNight = (currentBulbMode === 'night');
  const isSunset = (currentBulbMode === 'sunset');

  if (Array.isArray(mesh.material)) {
    [0, 1, 3, 4, 5].forEach(idx => {
      if (mesh.material[idx]) {
        mesh.material[idx].color.copy(sideColor);
        mesh.material[idx].roughness = isCyber ? 0.28 : (isElegant ? 0.18 : 0.42);
        mesh.material[idx].metalness = isCyber ? 0.85 : (isElegant ? 0.25 : 0.04);
        if (isOwned && isNight && lightPlayerAccent) {
          mesh.material[idx].emissive.setStyle(lightPlayerAccent);
          mesh.material[idx].emissiveIntensity = 0.50;
        } else if (isOwned && isSunset && lightPlayerAccent) {
          mesh.material[idx].emissive.setStyle(lightPlayerAccent);
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
    } else {
      frame.visible = false;
      frame.userData.borderMat.emissiveIntensity = 0;
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
    flagMesh.position.set(-0.18, 0, -0.75);
    flagMesh.scale.set(0.01, 0.01, 0.01);
    bGroup.add(flagMesh);
    animatedBuildingPopups.push({ mesh: flagMesh, startTime: performance.now(), duration: 400 });
  } else if (lvl >= 1 && lvl <= 3) {
    const hGroup = createDetailedHouseMesh(ownerColor, lvl);
    hGroup.position.set(0, 0, -0.78);
    hGroup.scale.set(0.01, 0.01, 0.01);
    bGroup.add(hGroup);
    animatedBuildingPopups.push({ mesh: hGroup, startTime: performance.now(), duration: 420 });
  } else if (lvl >= 4) {
    const towerGroup = createDetailedSkyscraperMesh(ownerColor);
    towerGroup.position.set(0, 0, -0.68);
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
}
