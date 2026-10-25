/**
 * three/stages/cityPreview.js
 * Isolated 3D viewport for Property Buy Modal & Tile Inspector:
 * renders a rotating 3D diorama pediment displaying the current building tier (Flag, House, or Skyscraper).
 */

import * as THREE from 'three';
import { GROUP_META, PLAYER_THEMES } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import {
  createDetailedFlagMesh,
  createDetailedHouseMesh,
  createDetailedSkyscraperMesh
} from '../assets/buildings.js';
import { disposeHierarchy } from '../core/dispose.js';

let cityPreviewRenderer = null;
let cityPreviewScene = null;
let cityPreviewCamera = null;
let cityPreviewGroup = null;
let activeCityPreviewCanvasId = null;

function ensureCityPreviewInitialized() {
  if (cityPreviewRenderer) return;
  cityPreviewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  cityPreviewRenderer.setSize(220, 110);
  cityPreviewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const canvas = cityPreviewRenderer.domElement;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
  }, false);
  canvas.addEventListener('webglcontextrestored', () => {
    if (cityPreviewRenderer) {
      cityPreviewRenderer.setSize(220, 110);
    }
  }, false);

  cityPreviewScene = new THREE.Scene();
  cityPreviewCamera = new THREE.PerspectiveCamera(34, 220 / 110, 0.1, 30);
  cityPreviewCamera.position.set(2.9, 2.2, 2.9);
  cityPreviewCamera.lookAt(0, 0.35, 0);

  cityPreviewScene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const dir = new THREE.DirectionalLight(0xfffbeb, 0.95);
  dir.position.set(4, 7, 5);
  cityPreviewScene.add(dir);

  cityPreviewGroup = new THREE.Group();
  cityPreviewScene.add(cityPreviewGroup);
}

/**
 * Mounts and populates the 3D showcase on the target modal canvas.
 * @param {object} tile - Tile definition object
 * @param {string} targetCanvasId - DOM canvas ID in the modal
 */
export function populateCityPreview3DScene(tile, targetCanvasId) {
  ensureCityPreviewInitialized();
  activeCityPreviewCanvasId = targetCanvasId;

  while (cityPreviewGroup.children.length > 0) {
    const child = cityPreviewGroup.children[0];
    disposeHierarchy(child);
    cityPreviewGroup.remove(child);
  }

  const groupColorHex = tile.group ? GROUP_META[tile.group].hex : '#38bdf8';
  const accentColor = new THREE.Color(groupColorHex);

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, 1.02, 0.24, 8),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, flatShading: true })
  );
  plinth.position.y = -0.12;
  cityPreviewGroup.add(plinth);

  const colorRim = new THREE.Mesh(
    new THREE.CylinderGeometry(1.22, 1.18, 0.08, 8),
    new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.35, flatShading: true })
  );
  colorRim.position.y = -0.02;
  cityPreviewGroup.add(colorRim);

  if (tile.type === 'city' || tile.type === 'resort') {
    const propState = gameState.properties[tile.id] || null;
    const lvl = propState?.level || 0;
    const ownerColorNum = (propState?.owner !== null && propState?.owner !== undefined && PLAYER_THEMES[propState.owner])
      ? PLAYER_THEMES[propState.owner].charColor
      : parseInt(groupColorHex.replace('#', '0x'), 16);

    if (lvl >= 4) {
      const tower = createDetailedSkyscraperMesh(ownerColorNum);
      tower.scale.set(0.68, 0.68, 0.68);
      tower.position.set(0, 0, 0);
      cityPreviewGroup.add(tower);
    } else if (lvl > 0 && lvl <= 3) {
      const house = createDetailedHouseMesh(ownerColorNum, lvl);
      const previewScale = lvl === 1 ? 1.05 : lvl === 2 ? 0.90 : 0.78;
      house.scale.set(previewScale, previewScale, previewScale);
      house.position.set(0, 0, 0);
      cityPreviewGroup.add(house);
    } else if (propState?.owner !== null && propState?.owner !== undefined) {
      const flag = createDetailedFlagMesh(ownerColorNum);
      flag.scale.set(0.65, 0.65, 0.65);
      flag.position.set(-0.30, 0, 0);
      cityPreviewGroup.add(flag);
    } else {
      const showcaseHouse = createDetailedHouseMesh(ownerColorNum, 1);
      showcaseHouse.scale.set(0.85, 0.85, 0.85);
      showcaseHouse.position.set(-0.35, 0, 0.15);

      const flag = createDetailedFlagMesh(ownerColorNum);
      flag.scale.set(0.48, 0.48, 0.48);
      flag.position.set(-0.70, 0, -0.35);

      const miniSkyscraper = createDetailedSkyscraperMesh(ownerColorNum);
      miniSkyscraper.scale.set(0.50, 0.50, 0.50);
      miniSkyscraper.position.set(0.40, 0, -0.15);

      cityPreviewGroup.add(showcaseHouse, flag, miniSkyscraper);
    }
  } else {
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.62, 0),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.7, flatShading: true })
    );
    gem.position.y = 0.68;
    cityPreviewGroup.add(gem);
  }

  cityPreviewGroup.scale.set(0.01, 0.01, 0.01);
  cityPreviewGroup.userData.openStartTime = performance.now();
}

export function clearCityPreview() {
  activeCityPreviewCanvasId = null;
}

/**
 * Per-frame animation tick for the modal city preview.
 * @param {number} now - performance.now()
 */
export function renderCityPreviewStage(now) {
  if (!activeCityPreviewCanvasId || !cityPreviewRenderer || !cityPreviewGroup) return;
  const targetCanvas = document.getElementById(activeCityPreviewCanvasId);
  if (!targetCanvas) return;

  // Web Games: Do not execute GPU passes when target modal or canvas is hidden
  if (!targetCanvas.offsetParent || targetCanvas.offsetWidth === 0 || targetCanvas.offsetHeight === 0) {
    return;
  }

  const elapsed = now - (cityPreviewGroup.userData.openStartTime || 0);
  const p = Math.min(1, elapsed / 460);
  const elasticScale = p === 1 ? 1 : 1 - Math.pow(2, -10 * p) * Math.cos((p * 10 - 0.75) * ((2 * Math.PI) / 3));

  cityPreviewGroup.scale.setScalar(Math.max(0.01, elasticScale));
  cityPreviewGroup.rotation.y = now * 0.0012;
  cityPreviewGroup.position.y = Math.sin(now * 0.003) * 0.05;
  cityPreviewRenderer.render(cityPreviewScene, cityPreviewCamera);

  const ctx = targetCanvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    ctx.drawImage(cityPreviewRenderer.domElement, 0, 0, targetCanvas.width, targetCanvas.height);
  }
}
