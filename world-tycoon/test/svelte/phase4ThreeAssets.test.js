/**
 * test/svelte/phase4ThreeAssets.test.js
 * Verification of Phase 4: 3D Asset pipeline optimization & procedural geometry cleanup.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { setupBrowserMocks } from '../setup.js';

setupBrowserMocks();

import {
  createDetailedFlagMesh,
  createDetailedHouseMesh,
  createDetailedSkyscraperMesh,
  updateBuildingAnimations,
  animatedFlags,
  animatedChimneySmokes,
  animatedSkyscraperBeacons
} from '../../src/three/assets/buildings.js';

import { createDetailed3DAvatarMesh } from '../../src/three/assets/avatars.js';

describe('Phase 4: 3D Asset Pipeline Optimization & Procedural Mesh Cleanup (/clean-code)', () => {
  it('creates detailed flag mesh with waving cloth hierarchy', () => {
    const flag = createDetailedFlagMesh(0x3b82f6);
    assert.ok(flag instanceof THREE.Group, 'Flag must be a THREE.Group');
    assert.ok(flag.children.length > 0, 'Flag must contain pole and cloth children');
    assert.ok(animatedFlags.length > 0, 'Flag must register into animatedFlags');
  });

  it('creates cottage, villa, and manor meshes for house upgrade levels 0, 1, and 2', () => {
    const cottage = createDetailedHouseMesh(0x10b981, 0);
    const villa = createDetailedHouseMesh(0x10b981, 1);
    const manor = createDetailedHouseMesh(0x10b981, 2);

    assert.ok(cottage instanceof THREE.Group, 'Cottage must be THREE.Group');
    assert.ok(villa instanceof THREE.Group, 'Villa must be THREE.Group');
    assert.ok(manor instanceof THREE.Group, 'Manor must be THREE.Group');

    assert.ok(cottage.children.length > 0);
    assert.ok(villa.children.length > 0);
    assert.ok(manor.children.length > 0);
  });

  it('creates 5-tier skyscraper mesh with spire and beacon', () => {
    const skyscraper = createDetailedSkyscraperMesh(0xf59e0b);
    assert.ok(skyscraper instanceof THREE.Group);
    assert.ok(skyscraper.children.length >= 6, 'Skyscraper must have podium, shaft, penthouse, spire, beacon');
    assert.ok(animatedSkyscraperBeacons.length > 0);
  });

  it('creates detailed 3D avatar figurine and portrait meshes', () => {
    const pawn = createDetailed3DAvatarMesh(0, false);
    const portrait = createDetailed3DAvatarMesh(1, true);

    assert.ok(pawn instanceof THREE.Group);
    assert.ok(portrait instanceof THREE.Group);

    assert.ok(pawn.userData.headGroup);
    assert.ok(pawn.userData.bodyGroup);
    assert.ok(pawn.userData.armGroupL);
    assert.ok(pawn.userData.armGroupR);
  });

  it('generates all executive hat variations (0 to 6) seamlessly', () => {
    for (let hat = 0; hat <= 6; hat++) {
      const avatar = createDetailed3DAvatarMesh(hat % 4, true, hat);
      assert.ok(avatar instanceof THREE.Group);
    }
  });

  it('executes updateBuildingAnimations without throwing errors', () => {
    assert.doesNotThrow(() => {
      updateBuildingAnimations(performance.now(), 1.5);
      updateBuildingAnimations(performance.now() + 100, 2.0);
    });
  });
});
