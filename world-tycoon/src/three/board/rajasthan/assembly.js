/**
 * three/board/rajasthan/assembly.js
 * Master Assembler: Builds and positions the 4 quadrants of the Royal Rajasthan Diorama.
 */

import * as THREE from 'three';
import { createRajasthanPalaceCitadel3D } from './architecture.js';
import { createRajasthanStepwellKund3D, createRajasthanOasisGrove3D } from './nature.js';
import { createRajasthanCaravanCamp3D } from './caravan.js';

/**
 * Assembles the complete authentic Rajasthan diorama centerpiece.
 * Carefully balanced across 4 quadrants to leave the central Chowk (x, z in [-2.8, 2.8])
 * completely unobstructed for 3D dice rolls and HUD controls.
 *
 * @param {THREE.Group} boardGroup
 * @returns {THREE.Group}
 */
export function buildRajasthanCenterpiece3D(boardGroup) {
  const rajasthanGroup = new THREE.Group();
  rajasthanGroup.name = 'rajasthan-centerpiece';

  // 1. North-West: Amber & Jaisalmer Palace Citadel
  const palace = createRajasthanPalaceCitadel3D();
  palace.position.set(-4.6, 0, -4.0);
  rajasthanGroup.add(palace);

  // 2. South-East: Symmetrical Royal Stepwell Kund (Panna Meena style)
  const stepwell = createRajasthanStepwellKund3D();
  stepwell.position.set(4.4, 0, 4.2);
  rajasthanGroup.add(stepwell);

  // 3. North-East: Desert Oasis & Date Palm Grove
  const oasis = createRajasthanOasisGrove3D();
  oasis.position.set(4.4, 0, -4.0);
  rajasthanGroup.add(oasis);

  // 4. South-West: Royal Caravan Camp with Resting Camel
  const caravan = createRajasthanCaravanCamp3D();
  caravan.position.set(-4.2, 0, 4.2);
  rajasthanGroup.add(caravan);

  boardGroup.add(rajasthanGroup);
  console.info('🏰 [Rajasthan Centerpiece] Built authentic Royal Sandstone Palace, Stepwell Kund, Oasis Grove & Caravan Station.');
  return rajasthanGroup;
}
