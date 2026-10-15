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
 * Comprehensive raycaster: tests tiles, placed building models, corner landmarks, and player tokens.
 * @returns {number|undefined}
 */
export function findIntersectedTileId() {
  if (!context.raycaster) return undefined;

  const targets = [
    ...Object.values(context.tilesMeshMap || {}),
    ...Object.values(context.tileBuildingGroups || {}),
    ...Object.values(context.cornerLandmarkGroups || {}),
    ...(context.playerMeshes || [])
  ];

  if (targets.length > 0) {
    const intersects = context.raycaster.intersectObjects(targets, true);
    if (intersects.length > 0) {
      const tileId = getIntersectedTileId(intersects);
      if (tileId !== undefined) return tileId;
    }
  }

  return undefined;
}

/**
 * Handles hover events to render the property inspector tooltip and tactile tile hover lifts.
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
      // Tactile button hover response: elevate hovered tile (0.24 in World Tour, 0.08 in standard play)
      BOARD_TILES.forEach(t => {
        if (context.activeTileDepressions[t.id]) {
          const isTarget = (t.id === tileId);
          if (isTarget) {
            context.activeTileDepressions[t.id].targetOffset = (gameState.phase === 'WORLD_TOUR') ? 0.24 : 0.08;
          } else if (context.activeTileDepressions[t.id].targetOffset > 0) {
            context.activeTileDepressions[t.id].targetOffset = 0;
          }
        }
      });

      if (gameState.phase === 'WORLD_TOUR') {
        tooltip.innerHTML = `
          <div class="flex items-center gap-2 border-b border-indigo-400 pb-1.5">
            <span class="text-base">✈️</span>
            <span class="font-extrabold text-xs tracking-wide text-white">WORLD TOUR DESTINATION</span>
          </div>
          <div class="text-sm font-extrabold text-amber-300 mt-1.5">${tile.name}</div>
          <div class="text-xs text-slate-200 font-semibold mt-0.5">Click to fly here immediately!</div>
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
        detailsHtml = `<div class="flex justify-between gap-4 text-xs text-slate-200 mt-1.5"><span>Price: <strong class="text-white font-bold">${fmtMoney(tile.price)}</strong></span><span>Rent: <strong class="text-emerald-400 font-bold">${curRent}</strong></span></div><div class="text-xs text-slate-200 mt-1">Owner: <strong class="text-white font-bold">${ownerText}</strong></div>`;
      } else {
        detailsHtml = `<div class="text-xs text-slate-200 mt-1.5 font-medium">${tile.subtitle || 'Special Board Tile'}</div>`;
      }

      tooltip.innerHTML = `<div class="flex items-center gap-2 border-b border-slate-700 pb-1.5"><span class="w-3.5 h-3.5 rounded-full flex-shrink-0" style="background:${groupColor}"></span><span class="font-extrabold text-sm tracking-wide text-white">${tile.name}</span></div>${detailsHtml}`;
      tooltip.style.left = `${event.clientX}px`;
      tooltip.style.top = `${event.clientY}px`;
      tooltip.classList.remove('hidden');
      if (context.renderer?.domElement) context.renderer.domElement.style.cursor = 'pointer';
      return;
    }
  }

  // Pointer moved away: smoothly reset hover elevation offsets
  BOARD_TILES.forEach(t => {
    if (context.activeTileDepressions[t.id] && context.activeTileDepressions[t.id].targetOffset > 0) {
      context.activeTileDepressions[t.id].targetOffset = 0;
    }
  });

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
    // Tactile button animation: punchy mechanical push-down
    triggerTileButtonPress(clickedTileId, -0.32, 240);
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
