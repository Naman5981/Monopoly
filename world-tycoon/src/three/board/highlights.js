/**
 * three/board/highlights.js
 * Highlight rings, flight runway targeting beacons, monopoly set completion halos,
 * and active player turn spotlights.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { BOARD_TILES, PLAYER_THEMES } from '../../game/data.js';
import { gameState } from '../../game/state.js';
import { getTileWorldPosition } from './coords.js';
import { getLightPlayerAccent } from '../core/lighting.js';

let activePlayerBeaconGroup = null;
let flightHighlightsGroup = null;
let monopolyRingsGroup = null;
const activeTurnSpriteMap = {};

export function buildTileHighlightRing3D(boardGroup = context.boardGroup) {
  if (!boardGroup) return;
  const ringGeo = new THREE.RingGeometry(1.15, 1.48, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x6c5ce7,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85
  });
  context.tileHighlightRing = new THREE.Mesh(ringGeo, ringMat);
  context.tileHighlightRing.rotation.x = -Math.PI / 2;
  context.tileHighlightRing.position.y = 0.48;
  context.tileHighlightRing.visible = false;
  boardGroup.add(context.tileHighlightRing);
}

export function setTileHighlightRing(tileId, visible, colorHex = null) {
  if (!context.tileHighlightRing) return;
  if (visible) {
    const pos = getTileWorldPosition(tileId);
    context.tileHighlightRing.position.set(pos.x, 0.48, pos.z);
    const pIdx = gameState.currentPlayerIdx;
    const theme = PLAYER_THEMES[pIdx];
    const targetColor = colorHex || theme?.colorHex || '#6c5ce7';
    context.tileHighlightRing.material.color.set(targetColor);
  }
  context.tileHighlightRing.visible = visible;
}

function createTurnBillboardTexture(name, colorHex) {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 96;
  const ctx = c.getContext('2d');

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(10, 10, 364, 76, 38);
  } else {
    ctx.rect(10, 10, 364, 76);
  }
  ctx.fill();

  ctx.strokeStyle = colorHex || '#6c5ce7';
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.font = '900 30px Inter, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cleanName = (name || 'PLAYER').toUpperCase();
  ctx.fillText(`★ ${cleanName}'S TURN ★`, 192, 48);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

export function buildActivePlayerHighlightSystem(boardGroup = context.boardGroup) {
  if (activePlayerBeaconGroup || !boardGroup) return;

  activePlayerBeaconGroup = new THREE.Group();
  boardGroup.add(activePlayerBeaconGroup);

  const innerRingGeo = new THREE.RingGeometry(0.68, 0.98, 32);
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: 0x6c5ce7,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92
  });
  const groundRingInner = new THREE.Mesh(innerRingGeo, innerRingMat);
  groundRingInner.rotation.x = -Math.PI / 2;
  groundRingInner.position.y = 0.06;
  activePlayerBeaconGroup.add(groundRingInner);

  const outerRingGeo = new THREE.RingGeometry(1.02, 1.28, 32);
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: 0xa89cf5,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.50
  });
  const groundRingOuter = new THREE.Mesh(outerRingGeo, outerRingMat);
  groundRingOuter.rotation.x = -Math.PI / 2;
  groundRingOuter.position.y = 0.05;
  activePlayerBeaconGroup.add(groundRingOuter);

  const pointerGroup = new THREE.Group();
  pointerGroup.position.y = 2.4;

  const diamondGeo = new THREE.OctahedronGeometry(0.30, 0);
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0x6c5ce7,
    emissive: 0x6c5ce7,
    emissiveIntensity: 0.55,
    roughness: 0.25,
    metalness: 0.4
  });
  const floatingDiamond = new THREE.Mesh(diamondGeo, diamondMat);
  pointerGroup.add(floatingDiamond);

  const coneGeo = new THREE.ConeGeometry(0.12, 0.28, 6);
  const coneMat = new THREE.MeshStandardMaterial({
    color: 0x6c5ce7,
    emissive: 0x6c5ce7,
    emissiveIntensity: 0.45
  });
  const pointerCone = new THREE.Mesh(coneGeo, coneMat);
  pointerCone.rotation.x = Math.PI;
  pointerCone.position.y = -0.30;
  pointerGroup.add(pointerCone);

  const spriteMat = new THREE.SpriteMaterial({ transparent: true });
  const turnSprite = new THREE.Sprite(spriteMat);
  turnSprite.scale.set(2.4, 0.62, 1);
  turnSprite.position.y = 0.65;
  pointerGroup.add(turnSprite);

  activePlayerBeaconGroup.add(pointerGroup);

  activePlayerBeaconGroup.userData = {
    groundRingInner,
    groundRingOuter,
    pointerGroup,
    floatingDiamond,
    pointerCone,
    turnSprite,
    spriteMat,
    lastPlayerIdx: -1
  };

  activePlayerBeaconGroup.visible = false;
}

export function setFlightModeHighlights(active, boardGroup = context.boardGroup) {
  if (!flightHighlightsGroup && boardGroup) {
    flightHighlightsGroup = new THREE.Group();
    boardGroup.add(flightHighlightsGroup);

    const ringGeo = new THREE.RingGeometry(1.08, 1.44, 28);
    BOARD_TILES.forEach(t => {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      const pos = getTileWorldPosition(t.id);
      ring.position.set(pos.x, 0.45, pos.z);
      ring.userData = { tileId: t.id };
      flightHighlightsGroup.add(ring);
    });
  }
  if (flightHighlightsGroup) {
    flightHighlightsGroup.visible = active;
  }
  if (!active) {
    BOARD_TILES.forEach(t => {
      if (context.activeTileDepressions[t.id]) {
        context.activeTileDepressions[t.id].targetOffset = 0;
      }
    });
  }
}

export function setMonopolyTileHighlights(tileIds, colorHex = '#facc15', boardGroup = context.boardGroup) {
  if (!monopolyRingsGroup && boardGroup) {
    monopolyRingsGroup = new THREE.Group();
    boardGroup.add(monopolyRingsGroup);
  }
  if (monopolyRingsGroup) {
    while (monopolyRingsGroup.children.length > 0) {
      monopolyRingsGroup.remove(monopolyRingsGroup.children[0]);
    }
  }
  if (!tileIds || tileIds.length === 0 || !monopolyRingsGroup) return;

  const ringGeo = new THREE.RingGeometry(1.15, 1.48, 32);
  const color = new THREE.Color(colorHex);
  tileIds.forEach(id => {
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(ringGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    const pos = getTileWorldPosition(id);
    mesh.position.set(pos.x, 0.46, pos.z);
    monopolyRingsGroup.add(mesh);
  });

  setTimeout(() => {
    if (monopolyRingsGroup) {
      while (monopolyRingsGroup.children.length > 0) {
        monopolyRingsGroup.remove(monopolyRingsGroup.children[0]);
      }
    }
  }, 4200);
}

/**
 * Updates active player spotlight beacon and monopoly ring pulsing each render frame.
 * @param {number} t - Time in seconds
 */
export function updateActivePlayerBeacon(t) {
  if (context.tileHighlightRing?.visible) {
    const s = 1 + Math.sin(t * 4.5) * 0.06;
    context.tileHighlightRing.scale.set(s, s, 1);
  }

  if (flightHighlightsGroup?.visible) {
    const pulseScale = 1 + Math.sin(t * 5.0) * 0.07;
    const pulseOpacity = 0.55 + Math.sin(t * 4.0) * 0.35;
    flightHighlightsGroup.children.forEach(ring => {
      ring.scale.set(pulseScale, pulseScale, 1);
      ring.material.opacity = pulseOpacity;
    });
  }

  if (monopolyRingsGroup && monopolyRingsGroup.children.length > 0) {
    const s = 1 + Math.sin(t * 6.0) * 0.12;
    monopolyRingsGroup.children.forEach(ring => ring.scale.set(s, s, 1));
  }

  if (activePlayerBeaconGroup && gameState.gameStarted) {
    const curP = gameState.players[gameState.currentPlayerIdx];
    const curMesh = context.playerMeshes[gameState.currentPlayerIdx];

    if (curP && !curP.bankrupt && curMesh && curMesh.visible) {
      activePlayerBeaconGroup.visible = true;
      const ud = activePlayerBeaconGroup.userData;
      activePlayerBeaconGroup.position.set(curMesh.position.x, curMesh.position.y, curMesh.position.z);

      ud.groundRingInner.rotation.z = t * 2.2;
      ud.groundRingOuter.rotation.z = -t * 1.6;
      const pulseScale = 1 + Math.sin(t * 4.5) * 0.10;
      ud.groundRingOuter.scale.set(pulseScale, pulseScale, 1);

      ud.floatingDiamond.rotation.y = t * 3.0;
      ud.floatingDiamond.rotation.x = Math.sin(t * 2.0) * 0.2;
      ud.pointerGroup.position.y = 2.45 + Math.sin(t * 4.2) * 0.16;

      if (ud.lastPlayerIdx !== gameState.currentPlayerIdx) {
        ud.lastPlayerIdx = gameState.currentPlayerIdx;
        const theme = PLAYER_THEMES[gameState.currentPlayerIdx];
        if (!activeTurnSpriteMap[gameState.currentPlayerIdx]) {
          activeTurnSpriteMap[gameState.currentPlayerIdx] = createTurnBillboardTexture(curP.name, theme?.colorHex);
        }
        ud.spriteMat.map = activeTurnSpriteMap[gameState.currentPlayerIdx];
        ud.spriteMat.needsUpdate = true;
        if (theme?.colorHex) {
          const mainCol = new THREE.Color(theme.colorHex);
          const lightCol = new THREE.Color(getLightPlayerAccent(theme.colorHex, 0.40));
          ud.groundRingInner.material.color.copy(mainCol);
          ud.groundRingOuter.material.color.copy(lightCol);
          if (ud.floatingDiamond) {
            ud.floatingDiamond.material.color.copy(mainCol);
            ud.floatingDiamond.material.emissive.copy(mainCol);
          }
          if (ud.pointerCone) {
            ud.pointerCone.material.color.copy(mainCol);
          }
        }
      }
    } else {
      activePlayerBeaconGroup.visible = false;
    }
  }
}
