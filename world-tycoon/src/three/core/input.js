/**
 * three/core/input.js
 * Mouse and pointer interaction: raycasting, drag-orbit board rotation, hover tooltips, and tile clicking.
 */

import * as THREE from 'three';
import { context } from './context.js';
import { cameraState, handleMouseWheelZoom, handleCameraWindowResize } from './camera.js';
import { BOARD_TILES, GROUP_META, PLAYER_THEMES } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { calculateTileRent } from '../../game/rules.js';
import { triggerTileButtonPress } from '../board/tilePress.js';

let lastHoverCheckTime = 0;

/**
 * Traverses up the hierarchy of intersected meshes to discover associated tile ID.
 * @param {THREE.Intersection[]} intersects
 * @returns {number|undefined}
 */
export function getIntersectedTileId(intersects) {
  for (let i = 0; i < intersects.length; i++) {
    let obj = intersects[i].object;
    while (obj && obj !== context.boardGroup && obj !== context.scene) {
      if (obj.userData?.tileId !== undefined) {
        return obj.userData.tileId;
      }
      if (obj.userData?.playerIdx !== undefined) {
        const p = gameState.players[obj.userData.playerIdx];
        if (p) return p.position;
      }
      obj = obj.parent;
    }
  }
  return undefined;
}

let cachedTileMeshes = null;
let lastTilesMeshMapRef = null;

function getTileMeshes() {
  if (!cachedTileMeshes || lastTilesMeshMapRef !== context.tilesMeshMap) {
    cachedTileMeshes = Object.values(context.tilesMeshMap);
    lastTilesMeshMapRef = context.tilesMeshMap;
  }
  return cachedTileMeshes;
}

/**
 * Fast multi-tier raycaster: tests primary tile collision boxes non-recursively first (O(1)),
 * falling back to avatars or landmarks only if necessary.
 * @returns {number|undefined}
 */
export function findIntersectedTileId() {
  const tileMeshes = getTileMeshes();
  if (tileMeshes.length > 0) {
    const tileIntersects = context.raycaster.intersectObjects(tileMeshes, false);
    if (tileIntersects.length > 0 && tileIntersects[0].object.userData?.tileId !== undefined) {
      return tileIntersects[0].object.userData.tileId;
    }
  }

  // Fallback 1: Avatar meshes
  if (context.playerMeshes && context.playerMeshes.length > 0) {
    const playerIntersects = context.raycaster.intersectObjects(context.playerMeshes, true);
    if (playerIntersects.length > 0) {
      const pTileId = getIntersectedTileId(playerIntersects);
      if (pTileId !== undefined) return pTileId;
    }
  }

  // Fallback 2: Corner landmark groups
  const landmarkGroups = Object.values(context.cornerLandmarkGroups);
  if (landmarkGroups.length > 0) {
    const landmarkIntersects = context.raycaster.intersectObjects(landmarkGroups, true);
    if (landmarkIntersects.length > 0) {
      const lTileId = getIntersectedTileId(landmarkIntersects);
      if (lTileId !== undefined) return lTileId;
    }
  }

  return undefined;
}

/**
 * Handles hover events to render the property inspector tooltip or highlight World Tour tiles.
 * @param {PointerEvent|MouseEvent} event
 */
export function handleCanvasHover(event) {
  const tooltip = document.getElementById('tile-hover-tooltip');
  if (!context.raycaster || !context.camera || !tooltip) return;

  context.mouseVec.x = (event.clientX / window.innerWidth) * 2 - 1;
  context.mouseVec.y = -(event.clientY / window.innerHeight) * 2 + 1;
  context.raycaster.setFromCamera(context.mouseVec, context.camera);

  const tileId = findIntersectedTileId();
    if (tileId !== undefined) {
      const tile = BOARD_TILES[tileId];
      if (tile) {
        if (gameState.phase === 'WORLD_TOUR') {
          BOARD_TILES.forEach(t => {
            if (context.activeTileDepressions[t.id]) {
              context.activeTileDepressions[t.id].targetOffset = (t.id === tileId) ? 0.22 : 0;
            }
          });
          tooltip.innerHTML = `
            <div class="flex items-center gap-2 border-b border-indigo-400 pb-1">
              <span class="text-sm">✈️</span>
              <span class="font-extrabold text-xs tracking-wide text-white">WORLD TOUR DESTINATION</span>
            </div>
            <div class="text-xs font-bold text-amber-300 mt-1">${tile.name}</div>
            <div class="text-[10px] text-slate-300">Click to fly here immediately!</div>
          `;
          tooltip.style.left = `${event.clientX}px`;
          tooltip.style.top = `${event.clientY}px`;
          tooltip.classList.remove('hidden');
          if (context.renderer?.domElement) context.renderer.domElement.style.cursor = 'pointer';
          return;
        }

        const st = gameState.properties[tileId];
        const groupColor = tile.group ? GROUP_META[tile.group].hex : '#38bdf8';
        const ownerText = (st?.owner !== null && st?.owner !== undefined)
          ? `<span style="color:${PLAYER_THEMES[st.owner].colorHex}">${gameState.players[st.owner]?.name}</span>`
          : 'Unowned';

        let detailsHtml = '';
        if (tile.type === 'city' || tile.type === 'resort') {
          const curRent = (st?.owner !== null && st?.owner !== undefined && !st.mortgaged)
            ? fmtMoney(calculateTileRent(tileId))
            : fmtMoney(tile.rent[0]);
          detailsHtml = `<div class="flex justify-between gap-4 text-[11px] text-slate-300 mt-1"><span>Price: <strong class="text-white">${fmtMoney(tile.price)}</strong></span><span>Rent: <strong class="text-emerald-400">${curRent}</strong></span></div><div class="text-[11px] text-slate-300 mt-0.5">Owner: <strong class="text-white">${ownerText}</strong></div>`;
        } else {
          detailsHtml = `<div class="text-[11px] text-slate-300 mt-1">${tile.subtitle || 'Special Board Tile'}</div>`;
        }

        tooltip.innerHTML = `<div class="flex items-center gap-2 border-b border-slate-700 pb-1"><span class="w-3 h-3 rounded-full flex-shrink-0" style="background:${groupColor}"></span><span class="font-extrabold text-xs tracking-wide text-white">${tile.name}</span></div>${detailsHtml}`;
        tooltip.style.left = `${event.clientX}px`;
        tooltip.style.top = `${event.clientY}px`;
        tooltip.classList.remove('hidden');
        if (context.renderer?.domElement) context.renderer.domElement.style.cursor = 'pointer';
        return;
      }
    }
  }

  if (gameState.phase === 'WORLD_TOUR') {
    BOARD_TILES.forEach(t => {
      if (context.activeTileDepressions[t.id]) context.activeTileDepressions[t.id].targetOffset = 0;
    });
  }

  tooltip.classList.add('hidden');
  if (context.renderer?.domElement) context.renderer.domElement.style.cursor = 'default';
}

/**
 * Handles clicks onto tiles or empty 3D space.
 * @param {PointerEvent|MouseEvent} event
 */
export function handleCanvasClick(event) {
  if (!context.raycaster || !context.camera) return;

  context.mouseVec.x = (event.clientX / window.innerWidth) * 2 - 1;
  context.mouseVec.y = -(event.clientY / window.innerHeight) * 2 + 1;
  context.raycaster.setFromCamera(context.mouseVec, context.camera);

  const clickedTileId = findIntersectedTileId();
  if (clickedTileId !== undefined) {
    triggerTileButtonPress(clickedTileId, -0.18, 180);
    if (typeof context.onTileClick === 'function') {
      context.onTileClick(clickedTileId);
    }
    return;
  }

  // Clicked outside board tile: dismiss property inspector if open
  if (typeof window.closeInspectorModal === 'function') {
    window.closeInspectorModal();
  }
}

/**
 * Wires up mouse and touch pointer event listeners to the canvas domElement.
 * @param {HTMLCanvasElement} domElement
 * @param {Function} onTileClickCb
 */
export function initInputHandlers(domElement, onTileClickCb) {
  context.onTileClick = onTileClickCb;

  let isDragging = false;
  let dragStartX = 0;
  let pointerMoved = false;

  domElement.addEventListener('pointerdown', e => {
    isDragging = true;
    dragStartX = e.clientX;
    pointerMoved = false;
  });

  window.addEventListener('pointermove', e => {
    if (isDragging) {
      const dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 5) {
        pointerMoved = true;
        cameraState.targetCameraAzimuth += dx * 0.0045;
        dragStartX = e.clientX;
      }
      const tooltip = document.getElementById('tile-hover-tooltip');
      if (tooltip) tooltip.classList.add('hidden');
    } else {
      const now = performance.now();
      if (now - lastHoverCheckTime > 30) {
        lastHoverCheckTime = now;
        handleCanvasHover(e);
      }
    }
  });

  window.addEventListener('pointerup', e => {
    if (!isDragging) return;
    isDragging = false;
    if (!pointerMoved) {
      handleCanvasClick(e);
    } else {
      // Snap to nearest 45 degree angle so board layout remains crisp and squared
      const snap = Math.PI / 4;
      cameraState.targetCameraAzimuth = Math.round(cameraState.targetCameraAzimuth / snap) * snap;
    }
  });

  // Mouse-centric zoom directly toward point under cursor
  domElement.addEventListener('wheel', handleMouseWheelZoom, { passive: false });

  // Window resize
  window.addEventListener('resize', handleCameraWindowResize);
}
