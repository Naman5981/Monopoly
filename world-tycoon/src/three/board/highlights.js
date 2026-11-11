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
import { disposeHierarchy } from '../core/dispose.js';

let activePlayerBeaconGroup = null;
let flightHighlightsGroup = null;
let monopolyRingsGroup = null;
let festivalHighlightsGroup = null;
let empireHighlightsGroup = null;
let empireActivePlayerIdx = null;
const originalTileMaterials = new Map();
const originalFrameEmissives = new Map();
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
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d');

  const themeColor = colorHex || '#6c5ce7';
  const cleanName = (name || 'PLAYER').toUpperCase();

  // 1. Outer Neon Aura & Drop Glow
  ctx.save();
  ctx.shadowColor = themeColor;
  ctx.shadowBlur = 24;

  // 2. High-contrast deep obsidian glass container
  const bgGrad = ctx.createLinearGradient(0, 16, 0, 240);
  bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.96)');
  bgGrad.addColorStop(1, 'rgba(8, 12, 28, 0.98)');
  ctx.fillStyle = bgGrad;

  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(24, 20, 976, 216, 64);
  } else {
    ctx.rect(24, 20, 976, 216);
  }
  ctx.fill();

  // 3. Crisp Glowing Border in player's theme color
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 10;
  ctx.stroke();

  // 4. Inner subtle highlight ring
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(32, 28, 960, 200, 56);
  } else {
    ctx.rect(32, 28, 960, 200);
  }
  ctx.stroke();
  ctx.restore();

  // 5. Overline Tag (better-typography: role-based hierarchy, uppercase, letter-spaced)
  ctx.save();
  ctx.font = '900 24px Rubik, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#facc15'; // Vibrant gold star accent
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 8;
  ctx.fillText('✦   A C T I V E   T U R N   ✦', 512, 70);

  // 6. Primary Headline: Player's Turn in bold, punchy, crisp typography
  const textLen = cleanName.length;
  const fontSize = textLen <= 7 ? 84 : (textLen <= 11 ? 72 : 60);
  ctx.font = `900 ${fontSize}px Rubik, system-ui, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.fillText(`${cleanName}'S TURN`, 512, 154);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 16;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

export function buildActivePlayerHighlightSystem(boardGroup = context.boardGroup) {
  if (activePlayerBeaconGroup || !boardGroup) return;

  activePlayerBeaconGroup = new THREE.Group();
  boardGroup.add(activePlayerBeaconGroup);

  const innerRingGeo = new THREE.RingGeometry(0.72, 1.05, 32);
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

  const outerRingGeo = new THREE.RingGeometry(1.10, 1.38, 32);
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
  pointerGroup.position.y = 3.90; // Elevated well above pawns, streetlights, and 3.2-unit Start Archway

  const diamondGeo = new THREE.OctahedronGeometry(0.42, 0);
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0x6c5ce7,
    emissive: 0x6c5ce7,
    emissiveIntensity: 0.65,
    roughness: 0.25,
    metalness: 0.4
  });
  const floatingDiamond = new THREE.Mesh(diamondGeo, diamondMat);
  pointerGroup.add(floatingDiamond);

  const coneGeo = new THREE.ConeGeometry(0.16, 0.38, 8);
  const coneMat = new THREE.MeshStandardMaterial({
    color: 0x6c5ce7,
    emissive: 0x6c5ce7,
    emissiveIntensity: 0.55
  });
  const pointerCone = new THREE.Mesh(coneGeo, coneMat);
  pointerCone.rotation.x = Math.PI;
  pointerCone.position.y = -0.42;
  pointerGroup.add(pointerCone);

  const spriteMat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
  const turnSprite = new THREE.Sprite(spriteMat);
  turnSprite.scale.set(6.4, 1.6, 1); // 2.67x larger for crystal-clear readability from isometric perspective
  turnSprite.position.y = 1.05;
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

    const ringGeo = new THREE.RingGeometry(1.08, 1.46, 32);
    BOARD_TILES.forEach(t => {
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      const pos = getTileWorldPosition(t.id);
      ring.position.set(pos.x, 0.466, pos.z);
      ring.userData = { tileId: t.id };
      flightHighlightsGroup.add(ring);
    });
  }
  if (flightHighlightsGroup) {
    flightHighlightsGroup.visible = active;
    context.flightHighlightsGroup = active ? flightHighlightsGroup : null;
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
 * Renders glowing breathing rings over properties eligible for World Festival 2x rent boost.
 * @param {boolean} active
 * @param {Array<number>} [tileIds=[]]
 * @param {string} [colorHex='#10b981']
 * @param {THREE.Group} [boardGroup=context.boardGroup]
 */
export function setFestivalSelectionHighlights(active, tileIds = [], colorHex = '#10b981', boardGroup = context.boardGroup) {
  if (!festivalHighlightsGroup && boardGroup) {
    festivalHighlightsGroup = new THREE.Group();
    boardGroup.add(festivalHighlightsGroup);
  }
  if (festivalHighlightsGroup) {
    while (festivalHighlightsGroup.children.length > 0) {
      const child = festivalHighlightsGroup.children[0];
      festivalHighlightsGroup.remove(child);
      if (child.children && child.children.length > 0) {
        while (child.children.length > 0) {
          const sub = child.children[0];
          child.remove(sub);
          if (sub.geometry) sub.geometry.dispose();
          if (sub.material) sub.material.dispose();
        }
      }
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
  }

  if (!active || !tileIds || tileIds.length === 0 || !festivalHighlightsGroup) {
    if (festivalHighlightsGroup) festivalHighlightsGroup.visible = false;
    context.festivalHighlightsGroup = null;
    return;
  }

  const ringGeo = new THREE.RingGeometry(1.08, 1.48, 32);
  const discGeo = new THREE.CircleGeometry(1.06, 32);
  const beamGeo = new THREE.CylinderGeometry(0.82, 1.12, 2.4, 24, 1, true);

  const primaryColor = new THREE.Color(colorHex);
  const glowColor = new THREE.Color('#34d399');

  tileIds.forEach(id => {
    const itemGroup = new THREE.Group();
    const pos = getTileWorldPosition(id);
    itemGroup.position.set(pos.x, 0.466, pos.z);

    // 1. Outer breathing ring
    const ringMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    itemGroup.add(ring);

    // 2. Inner radiant ground disc
    const discMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.002;
    itemGroup.add(disc);

    // 3. Vertical luminous festival spotlight beam
    const beamMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.40,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.20;
    itemGroup.add(beam);

    itemGroup.userData = { tileId: id, ring, disc, beam };
    festivalHighlightsGroup.add(itemGroup);
  });

  festivalHighlightsGroup.visible = true;
  context.festivalHighlightsGroup = festivalHighlightsGroup;
}

/**
 * Activates or deactivates the 3D Empire Spotlight for a given player.
 * Illuminates territory via glowing architectural border frames, ground light pools,
 * and subtle contrast dimming of non-owned properties without awkward floating rings.
 * Passing null resets the board to standard lighting.
 * @param {number|null} targetPlayerIdx
 */
export function setEmpireSpotlight(targetPlayerIdx) {
  if (!context.boardGroup) return;

  if (!empireHighlightsGroup) {
    empireHighlightsGroup = new THREE.Group();
    empireHighlightsGroup.name = 'empireHighlightsGroup';
    context.boardGroup.add(empireHighlightsGroup);
  } else if (empireHighlightsGroup.parent !== context.boardGroup) {
    context.boardGroup.add(empireHighlightsGroup);
  }

  // Clear any legacy child meshes
  while (empireHighlightsGroup.children.length > 0) {
    const child = empireHighlightsGroup.children[0];
    disposeHierarchy(child);
    empireHighlightsGroup.remove(child);
  }

  const isNight = (gameState.bulbMode === 'night');
  const isSunset = (gameState.bulbMode === 'sunset');

  // If null or undefined, restore standard board lighting
  if (targetPlayerIdx === null || targetPlayerIdx === undefined) {
    empireActivePlayerIdx = null;
    empireHighlightsGroup.visible = false;

    // Restore top materials
    if (originalTileMaterials.size > 0) {
      BOARD_TILES.forEach(tile => {
        const mesh = context.tilesMeshMap[tile.id];
        if (mesh && Array.isArray(mesh.material) && mesh.material[2]) {
          const topMat = mesh.material[2];
          const orig = originalTileMaterials.get(tile.id);
          if (orig) topMat.color.setHex(orig.colorHex);
        }
      });
      originalTileMaterials.clear();
    }

    // Restore border frames & ground pools
    BOARD_TILES.forEach(tile => {
      const prop = gameState.properties?.[tile.id];
      const isOwned = prop && prop.owner !== null && prop.owner !== undefined;
      const frame = context.tileBorderFrames?.[tile.id];
      if (frame && frame.userData?.borderMat) {
        frame.scale.set(1.0, 1.0, 1.0);
        const isLocalPlayer = (prop?.owner === gameState.localPlayerIdx);
        if (isOwned) {
          const baseIntensity = isNight ? 0.85 : (isSunset ? 0.50 : 0.28);
          frame.userData.borderMat.emissiveIntensity = isLocalPlayer ? baseIntensity * 1.5 : baseIntensity;
        } else {
          frame.userData.borderMat.emissiveIntensity = 0;
        }
      }

      const pool = context.tileGroundLightPools?.[tile.id];
      if (pool && pool.material) {
        pool.visible = false;
        pool.material.opacity = 0;
      }
    });

    return;
  }

  empireActivePlayerIdx = targetPlayerIdx;
  empireHighlightsGroup.visible = true;

  const theme = PLAYER_THEMES[targetPlayerIdx];
  const colorHex = theme?.colorHex || '#3b82f6';
  const threeColor = new THREE.Color(colorHex);

  // Find all tiles owned by targetPlayerIdx
  const ownedTileIds = [];
  BOARD_TILES.forEach(tile => {
    const prop = gameState.properties?.[tile.id];
    if (prop && prop.owner === targetPlayerIdx) {
      ownedTileIds.push(tile.id);
    }
  });

  // Apply focus contrast: brighten owned tiles and ground pools, dim non-owned
  BOARD_TILES.forEach(tile => {
    const isOwnedByTarget = ownedTileIds.includes(tile.id);
    const mesh = context.tilesMeshMap[tile.id];
    if (mesh && Array.isArray(mesh.material) && mesh.material[2]) {
      const topMat = mesh.material[2];
      if (!originalTileMaterials.has(tile.id)) {
        originalTileMaterials.set(tile.id, {
          colorHex: topMat.color.getHex()
        });
      }

      if (!isOwnedByTarget) {
        topMat.color.setHex(0x7c8ba1);
      } else {
        topMat.color.setHex(0xffffff);
      }
    }

    const frame = context.tileBorderFrames?.[tile.id];
    if (frame && frame.userData?.borderMat) {
      if (isOwnedByTarget) {
        frame.scale.set(1.03, 1.0, 1.03);
        frame.userData.borderMat.emissiveIntensity = 1.25;
      } else {
        frame.scale.set(1.0, 1.0, 1.0);
        frame.userData.borderMat.emissiveIntensity = 0.08;
      }
    }

    const pool = context.tileGroundLightPools?.[tile.id];
    if (pool && pool.material) {
      if (isOwnedByTarget) {
        pool.visible = true;
        pool.material.color.copy(threeColor);
        pool.material.opacity = 0.55;
      } else {
        pool.visible = false;
        pool.material.opacity = 0;
      }
    }
  });
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
    const pulseScale = 1 + Math.sin(t * 4.8) * 0.09;
    const pulseOpacity = 0.65 + Math.sin(t * 4.8) * 0.35; // Dynamic breath: 0.30 to 1.00
    flightHighlightsGroup.children.forEach(ring => {
      const tileId = ring.userData?.tileId;
      const tileMesh = tileId !== undefined ? context.tilesMeshMap[tileId] : null;
      if (tileMesh) {
        ring.position.y = tileMesh.position.y + 0.128; // Always rests on top surface, tracks elevation
      }
      ring.scale.set(pulseScale, pulseScale, 1);
      ring.material.opacity = pulseOpacity;
    });
  }

  if (festivalHighlightsGroup?.visible) {
    // Breathing style highlight: radiant continuous wave with flashing beacons
    const pulseScale = 1 + Math.sin(t * 4.6) * 0.16;
    const pulseOpacity = 0.55 + Math.sin(t * 4.6) * 0.40; // 0.15 to 0.95 breath
    const beamPulseHeight = 1 + Math.sin(t * 4.6) * 0.22;

    festivalHighlightsGroup.children.forEach(item => {
      const tileId = item.userData?.tileId;
      const tileMesh = tileId !== undefined ? context.tilesMeshMap[tileId] : null;
      if (tileMesh) {
        item.position.y = tileMesh.position.y + 0.130;
      }
      item.scale.set(pulseScale, 1, pulseScale);

      const { ring, disc, beam } = item.userData || {};
      if (ring?.material) ring.material.opacity = pulseOpacity;
      if (disc?.material) disc.material.opacity = pulseOpacity * 0.45;
      if (beam) {
        beam.scale.set(pulseScale, beamPulseHeight, pulseScale);
        if (beam.material) beam.material.opacity = pulseOpacity * 0.55;
      }
    });
  }

  if (empireActivePlayerIdx !== null) {
    const s = 1 + Math.sin(t * 4.8) * 0.025;
    const poolOp = 0.40 + Math.sin(t * 4.8) * 0.20;
    BOARD_TILES.forEach(tile => {
      const prop = gameState.properties?.[tile.id];
      if (prop && prop.owner === empireActivePlayerIdx) {
        const frame = context.tileBorderFrames?.[tile.id];
        if (frame) frame.scale.set(s, 1.0, s);
        const pool = context.tileGroundLightPools?.[tile.id];
        if (pool?.material) pool.material.opacity = poolOp;
      }
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
      ud.pointerGroup.position.y = 3.90 + Math.sin(t * 3.5) * 0.18;
      const billboardPulse = 1 + Math.sin(t * 3.5) * 0.03;
      ud.turnSprite.scale.set(6.4 * billboardPulse, 1.6 * billboardPulse, 1);

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
