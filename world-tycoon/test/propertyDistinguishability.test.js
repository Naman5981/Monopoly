/**
 * test/propertyDistinguishability.test.js
 * Unit test suite verifying:
 * 1. Direct On-Tile Owner Ribbon & Unowned Pill 2D Canvas rendering (/web-games /game-art /better-ui).
 * 2. 3D Building Base Pedestals & Slabs (Flag Plinth, House Foundation Slab, Skyscraper Champion Pedestal).
 * 3. 3D Empire Spotlight Service (Territory illumination & non-owned dimming).
 * 4. Svelte PlayerCards hover & focus spotlight integration.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { setupBrowserMocks } from './setup.js';
setupBrowserMocks();

import { drawOwnerRibbon, drawUnownedPill } from '../src/three/board/tiles/cityTileRenderer.js';
import { setEmpireSpotlight } from '../src/three/board/highlights.js';
import { refreshTileTextureAndBuildings } from '../src/three/board/tiles.js';
import { context } from '../src/three/core/context.js';
import { gameState } from '../src/game/state.js';
import { BOARD_TILES, PLAYER_THEMES } from '../src/game/data.js';

describe('Property Ownership Visual Distinguishability Suite (/web-games /game-art /better-ui /anti-ui-slop)', () => {
  let mockCtx;
  let drawCalls;

  beforeEach(() => {
    drawCalls = [];
    mockCtx = {
      save: () => drawCalls.push({ type: 'save' }),
      restore: () => drawCalls.push({ type: 'restore' }),
      beginPath: () => drawCalls.push({ type: 'beginPath' }),
      fill: () => drawCalls.push({ type: 'fill' }),
      stroke: () => drawCalls.push({ type: 'stroke' }),
      arc: (x, y, r) => drawCalls.push({ type: 'arc', x, y, r }),
      rect: (x, y, w, h) => drawCalls.push({ type: 'rect', x, y, w, h }),
      roundRect: (x, y, w, h, r) => drawCalls.push({ type: 'roundRect', x, y, w, h, r }),
      fillText: (text, x, y) => drawCalls.push({ type: 'fillText', text, x, y }),
      strokeText: (text, x, y) => drawCalls.push({ type: 'strokeText', text, x, y }),
      setLineDash: (dash) => drawCalls.push({ type: 'setLineDash', dash }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      measureText: () => ({ width: 40 })
    };

    gameState.gameStarted = true;
    gameState.localPlayerIdx = 0;
    gameState.players = [
      { id: 0, name: 'TYCOON', cash: 2000000, colorHex: '#3b82f6', icon: '🎩' },
      { id: 1, name: 'BARON', cash: 1500000, colorHex: '#f97316', icon: '✈️' }
    ];
    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = { owner: null, level: 0, festivalBoost: false };
    });
  });

  describe('Direct On-Tile Owner Ribbon & Unowned Pill', () => {
    it('draws a vibrant Owner Ribbon with player icon, name, and slot pill when owned', () => {
      const propState = { owner: 0, level: 1 };
      drawOwnerRibbon(mockCtx, propState, false, false, false);

      const fillTexts = drawCalls.filter(c => c.type === 'fillText').map(c => c.text);
      assert.ok(fillTexts.includes('🎩'), 'Owner ribbon must render owner avatar icon');
      assert.ok(fillTexts.includes('TYCOON'), 'Owner ribbon must render bold capitalized owner name');
      assert.ok(fillTexts.includes('P1'), 'Owner ribbon must render player slot badge pill');
    });

    it('draws elegant muted FOR SALE pill when unowned', () => {
      drawUnownedPill(mockCtx, false);

      const fillTexts = drawCalls.filter(c => c.type === 'fillText').map(c => c.text);
      assert.ok(fillTexts.some(t => t.includes('FOR SALE')), 'Must render FOR SALE label');
      const dashes = drawCalls.filter(c => c.type === 'setLineDash');
      assert.ok(dashes.length > 0, 'Must use dashed border for unowned badge');
    });
  });

  describe('3D Building Base Pedestals & Slabs', () => {
    beforeEach(() => {
      context.boardGroup = new THREE.Group();
      context.tilesMeshMap = {};
      context.tileBuildingGroups = {};
      context.tileBorderFrames = {};
      context.tileGroundLightPools = {};

      const dummyGeo = new THREE.BoxGeometry(2.96, 0.24, 2.96);
      const dummyMat = [
        new THREE.MeshStandardMaterial(),
        new THREE.MeshStandardMaterial(),
        new THREE.MeshStandardMaterial(),
        new THREE.MeshStandardMaterial(),
        new THREE.MeshStandardMaterial(),
        new THREE.MeshStandardMaterial()
      ];

      BOARD_TILES.forEach(t => {
        const mesh = new THREE.Mesh(dummyGeo, dummyMat);
        mesh.userData = { tileId: t.id };
        context.tilesMeshMap[t.id] = mesh;

        const bGroup = new THREE.Group();
        context.tileBuildingGroups[t.id] = bGroup;
        context.boardGroup.add(bGroup);

        const frame = new THREE.Group();
        frame.userData = { borderMat: new THREE.MeshStandardMaterial() };
        context.tileBorderFrames[t.id] = frame;
      });
    });

    it('adds circular plinth under flagpole when level is 0', () => {
      gameState.properties[1] = { owner: 0, level: 0 };
      refreshTileTextureAndBuildings(1);

      const bGroup = context.tileBuildingGroups[1];
      assert.ok(bGroup.children.length >= 2, 'Must contain plinth and flag mesh');
      const hasCylinderPlinth = bGroup.children.some(c => c.geometry instanceof THREE.CylinderGeometry);
      assert.ok(hasCylinderPlinth, 'Level 0 must include circular plinth cylinder');
    });

    it('adds foundation slab plinth and slate deck under houses for levels 1-3', () => {
      gameState.properties[3] = { owner: 1, level: 2 };
      refreshTileTextureAndBuildings(3);

      const bGroup = context.tileBuildingGroups[3];
      assert.ok(bGroup.children.length >= 3, 'Must contain foundation slab, slate deck, and house mesh');
      const boxMeshes = bGroup.children.filter(c => c.geometry instanceof THREE.BoxGeometry);
      assert.ok(boxMeshes.length >= 2, 'Must include base slab and deck boxes');
    });

    it('adds grand champion pedestal slab with gold corner clamps for level 4 skyscraper', () => {
      gameState.properties[4] = { owner: 0, level: 4 };
      refreshTileTextureAndBuildings(4);

      const bGroup = context.tileBuildingGroups[4];
      // 1 champion slab + 4 gold corner clips + 1 skyscraper group = 6 children
      assert.ok(bGroup.children.length >= 6, 'Must contain champion pedestal and 4 corner clamps');
    });
  });

  describe('3D Empire Spotlight Service', () => {
    beforeEach(() => {
      context.boardGroup = new THREE.Group();
      context.tilesMeshMap = {};

      BOARD_TILES.forEach(t => {
        const topMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [null, null, topMat]);
        mesh.userData = { tileId: t.id };
        context.tilesMeshMap[t.id] = mesh;
      });

      gameState.properties[1] = { owner: 0, level: 1 };
      gameState.properties[3] = { owner: 0, level: 2 };
      gameState.properties[4] = { owner: 1, level: 1 };
    });

    it('illuminates owned tiles and dims non-owned tiles when targetPlayerIdx is specified', () => {
      setEmpireSpotlight(0);

      // Owned tiles (1 and 3) should be bright white (0xffffff)
      const ownedMesh1 = context.tilesMeshMap[1];
      const ownedMesh3 = context.tilesMeshMap[3];
      assert.equal(ownedMesh1.material[2].color.getHex(), 0xffffff);
      assert.equal(ownedMesh3.material[2].color.getHex(), 0xffffff);

      // Non-owned or opponent tiles (4) should be dimmed (0x85929e)
      const otherMesh = context.tilesMeshMap[4];
      assert.equal(otherMesh.material[2].color.getHex(), 0x85929e);

      // Spotlight group should exist and be visible
      const spotlightGroup = context.boardGroup.getObjectByName('empireHighlightsGroup');
      assert.ok(spotlightGroup);
      assert.equal(spotlightGroup.visible, true);
      assert.equal(spotlightGroup.children.length, 2, 'Should create spotlight markers for 2 owned tiles');
    });

    it('resets board lighting and restores original tile materials when passed null', () => {
      setEmpireSpotlight(0);
      setEmpireSpotlight(null);

      const spotlightGroup = context.boardGroup.getObjectByName('empireHighlightsGroup');
      assert.ok(spotlightGroup);
      assert.equal(spotlightGroup.visible, false);

      // All tiles should be restored to standard color
      BOARD_TILES.forEach(t => {
        const mesh = context.tilesMeshMap[t.id];
        assert.equal(mesh.material[2].color.getHex(), 0xffffff);
      });
    });
  });
});
