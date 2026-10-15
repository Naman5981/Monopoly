/**
 * three/core/input.js
 * Mouse and pointer interaction: raycasting, drag-orbit board rotation, hover tooltips, and tile clicking.
 */

import * as THREE from 'three';
import { context } from './context.js';
import { cameraState, handleMouseWheelZoom, handleCameraWindowResize, updateIsometricCamera } from './camera.js';
import { BOARD_TILES, GROUP_META, PLAYER_THEMES } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { calculateTileRent } from '../../game/rules.js';
import { triggerTileButtonPress } from '../board/tilePress.js';
import { BASE_TILE_Y } from '../board/coords.js';

const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BASE_TILE_Y);
const panRaycaster = new THREE.Raycaster();
const panMouseVec = new THREE.Vector2();
const panPoint = new THREE.Vector3();

function getGroundPoint(clientX, clientY) {
  if (!context.camera) return null;
  panMouseVec.x = (clientX / window.innerWidth) * 2 - 1;
  panMouseVec.y = -(clientY / window.innerHeight) * 2 + 1;
  panRaycaster.setFromCamera(panMouseVec, context.camera);
  const hit = panRaycaster.ray.intersectPlane(groundPlane, panPoint);
  return hit ? hit.clone() : null;
}

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

let cachedTargets = null;
let lastTargetsRefresh = 0;

export function invalidateRaycastTargets() {
  cachedTargets = null;
}

/**
 * Comprehensive raycaster: tests tiles, placed building models, corner landmarks, and player tokens.
 * @returns {number|undefined}
 */
export function findIntersectedTileId() {
  if (!context.raycaster) return undefined;

  const now = performance.now();
  if (!cachedTargets || now - lastTargetsRefresh > 600) {
    lastTargetsRefresh = now;
    cachedTargets = [
      ...Object.values(context.tilesMeshMap || {}),
      ...Object.values(context.tileBuildingGroups || {}),
      ...Object.values(context.cornerLandmarkGroups || {}),
      ...(context.playerMeshes || [])
    ];
  }

  if (cachedTargets.length > 0) {
    const intersects = context.raycaster.intersectObjects(cachedTargets, true);
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
  const isZoomed = (cameraState.targetCameraZoom > 1.05 || cameraState.cameraZoom > 1.05);
  if (context.renderer?.domElement) context.renderer.domElement.style.cursor = isZoomed ? 'grab' : 'default';
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
    // Tactile button animation: punchy mechanical push-down (safely kept above diorama rim)
    triggerTileButtonPress(clickedTileId, -0.11, 220);
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
  let dragStartY = 0;
  let lastDragX = 0;
  let lastDragY = 0;
  let dragButton = 0;
  let isPanningMode = false;
  let pointerMoved = false;

  domElement.addEventListener('contextmenu', e => e.preventDefault());

  domElement.addEventListener('pointerdown', e => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    lastDragX = e.clientX;
    lastDragY = e.clientY;
    dragButton = e.button;
    pointerMoved = false;

    const isZoomed = (cameraState.targetCameraZoom > 1.05 || cameraState.cameraZoom > 1.05);
    // Left-click while zoomed in or middle-click pans; otherwise left-click when zoomed out or right-click rotates
    isPanningMode = (e.button === 1) || (e.button === 0 && isZoomed);

    if (isPanningMode) {
      domElement.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('pointermove', e => {
    if (isDragging) {
      const totalDx = e.clientX - dragStartX;
      const totalDy = e.clientY - dragStartY;

      if (Math.hypot(totalDx, totalDy) > 4) {
        pointerMoved = true;
      }

      if (pointerMoved) {
        if (isPanningMode) {
          domElement.style.cursor = 'grabbing';
          const prevPt = getGroundPoint(lastDragX, lastDragY);
          const currPt = getGroundPoint(e.clientX, e.clientY);
          if (prevPt && currPt) {
            const delta = currPt.clone().sub(prevPt);
            // Move camera target opposite to drag vector so world moves 1:1 with cursor
            cameraState.targetCameraTarget.sub(delta);
            cameraState.cameraTarget.sub(delta);

            const maxPan = 13.5;
            cameraState.targetCameraTarget.x = Math.max(-maxPan, Math.min(maxPan, cameraState.targetCameraTarget.x));
            cameraState.targetCameraTarget.z = Math.max(-maxPan, Math.min(maxPan, cameraState.targetCameraTarget.z));
            cameraState.cameraTarget.x = Math.max(-maxPan, Math.min(maxPan, cameraState.cameraTarget.x));
            cameraState.cameraTarget.z = Math.max(-maxPan, Math.min(maxPan, cameraState.cameraTarget.z));

            updateIsometricCamera();
          }
        } else {
          // Orbit rotate azimuth
          const dx = e.clientX - lastDragX;
          cameraState.targetCameraAzimuth += dx * 0.0045;
        }

        lastDragX = e.clientX;
        lastDragY = e.clientY;
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

    const isZoomed = (cameraState.targetCameraZoom > 1.05 || cameraState.cameraZoom > 1.05);
    domElement.style.cursor = isZoomed ? 'grab' : 'default';

    if (!pointerMoved) {
      if (dragButton === 0) {
        handleCanvasClick(e);
      }
    } else if (!isPanningMode) {
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
