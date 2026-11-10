/**
 * three/board/skins.js
 * Board Style / Skin System:
 * - Wood: Authentic mahogany wood diorama, brass brackets, classic asphalt road & green park.
 * - Cyberpunk: Dark obsidian carbon base, glowing neon cyan/magenta circuits, neon cyber-grid park & synthwave highway.
 * - Elegant: Italian Carrara white marble with gold veining, 24K gold leaf brackets, royal pearl promenade & emerald parterre garden.
 * 
 * Clean Code Architecture:
 * - Procedural Texture Generators: ./skinTextures.js
 * - 3D Material & Mesh State Switcher: skins.js
 */

import * as THREE from 'three';
import { matchSettings } from '../../game/state.js';
import { dioramaMeshes, createProceduralWoodTexture, updateDioramaCenterForEdition } from './diorama.js';
import { refreshAllTileTexturesAndMaterials } from './tiles.js';
import { applyLightingMode } from '../effects.js';
import { getSceneLighting } from '../core/lighting.js';

import {
  createProceduralCyberpunkBaseTexture,
  createProceduralMarbleBaseTexture,
  createWoodParkTexture,
  createCyberpunkParkTexture,
  createElegantParkTexture
} from './skinTextures.js';

export * from './skinTextures.js';

export const BOARD_STYLES = ['wood', 'cyberpunk', 'elegant'];

let cachedTextures = {
  woodBase: null,
  woodPark: null,
  cyberBase: null,
  cyberPark: null,
  marbleBase: null,
  marblePark: null
};

/**
 * Applies the selected board skin (wood, cyberpunk, elegant) to all 3D meshes.
 * @param {'wood'|'cyberpunk'|'elegant'} styleName
 */
export function applyBoardStyle(styleName = 'wood') {
  const style = BOARD_STYLES.includes(styleName) ? styleName : 'wood';
  matchSettings.boardStyle = style;

  // 1. Base plinth & body materials
  if (style === 'cyberpunk') {
    if (!cachedTextures.cyberBase) cachedTextures.cyberBase = createProceduralCyberpunkBaseTexture();
    if (!cachedTextures.cyberPark) cachedTextures.cyberPark = createCyberpunkParkTexture();

    const cyberMat = new THREE.MeshStandardMaterial({
      map: cachedTextures.cyberBase,
      roughness: 0.22,
      metalness: 0.65
    });

    if (dioramaMeshes.plinthMesh) dioramaMeshes.plinthMesh.material = cyberMat;
    if (dioramaMeshes.earthMesh) dioramaMeshes.earthMesh.material = cyberMat;
    if (dioramaMeshes.lipMesh) dioramaMeshes.lipMesh.material = cyberMat;

    // Corner brackets: Dark titanium with glowing cyan nodes
    const cyberCornerMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.18,
      metalness: 0.90
    });
    const cyberNodeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.20
    });

    dioramaMeshes.cornerGroups.forEach(cg => {
      if (cg.children[0]) cg.children[0].material = cyberCornerMat;
      if (cg.children[1]) cg.children[1].material = cyberCornerMat;
      if (cg.children[2]) cg.children[2].material = cyberNodeMat;
    });

    // Rim: Gunmetal titanium with subtle edge accent
    if (dioramaMeshes.rimMesh) {
      dioramaMeshes.rimMesh.material = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.28,
        metalness: 0.85
      });
    }

    // Inner park roadway & obsidian tech plaza
    if (dioramaMeshes.innerMesh) {
      dioramaMeshes.innerMesh.material = new THREE.MeshStandardMaterial({
        map: cachedTextures.cyberPark,
        roughness: 0.35,
        metalness: 0.30
      });
    }

    // Update trees to obsidian faceted crystal sculptures
    dioramaMeshes.treeClusters.forEach(cluster => {
      cluster.traverse(child => {
        if (child.isMesh && child.geometry?.type === 'ConeGeometry') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x0b1324,
            emissive: 0x0284c7,
            emissiveIntensity: 0.08,
            roughness: 0.20,
            metalness: 0.75
          });
        } else if (child.isMesh && child.geometry?.type === 'CylinderGeometry') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.35,
            metalness: 0.85
          });
        }
      });
    });

    // Update fountain to calm holographic crystal emitter
    if (dioramaMeshes.fountain) {
      dioramaMeshes.fountain.traverse(child => {
        if (child.isMesh && child.material?.transparent) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.20,
            transparent: true,
            opacity: 0.70,
            roughness: 0.15
          });
        }
      });
    }

  } else if (style === 'elegant') {
    if (!cachedTextures.marbleBase) cachedTextures.marbleBase = createProceduralMarbleBaseTexture();
    if (!cachedTextures.marblePark) cachedTextures.marblePark = createElegantParkTexture();

    const marbleMat = new THREE.MeshStandardMaterial({
      map: cachedTextures.marbleBase,
      roughness: 0.15,
      metalness: 0.15
    });

    if (dioramaMeshes.plinthMesh) dioramaMeshes.plinthMesh.material = marbleMat;
    if (dioramaMeshes.earthMesh) dioramaMeshes.earthMesh.material = marbleMat;
    if (dioramaMeshes.lipMesh) dioramaMeshes.lipMesh.material = marbleMat;

    // Corner brackets: Mirror-polished 24K Gold
    const goldCornerMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.12,
      metalness: 0.95
    });

    dioramaMeshes.cornerGroups.forEach(cg => {
      if (cg.children[0]) cg.children[0].material = goldCornerMat;
      if (cg.children[1]) cg.children[1].material = goldCornerMat;
      if (cg.children[2]) cg.children[2].material = goldCornerMat;
    });

    // Rim: Champagne Gold
    if (dioramaMeshes.rimMesh) {
      dioramaMeshes.rimMesh.material = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.18,
        metalness: 0.85
      });
    }

    // Inner park: Pearl Promenade & Versailles garden
    if (dioramaMeshes.innerMesh) {
      dioramaMeshes.innerMesh.material = new THREE.MeshStandardMaterial({
        map: cachedTextures.marblePark,
        roughness: 0.28,
        metalness: 0.15
      });
    }

    // Royal topiary trees
    dioramaMeshes.treeClusters.forEach(cluster => {
      cluster.traverse(child => {
        if (child.isMesh && child.geometry?.type === 'ConeGeometry') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x047857,
            roughness: 0.35,
            metalness: 0.15
          });
        } else if (child.isMesh && child.geometry?.type === 'CylinderGeometry') {
          child.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.2,
            metalness: 0.1
          });
        }
      });
    });

    // Pristine marble fountain with azure crystal water
    if (dioramaMeshes.fountain) {
      dioramaMeshes.fountain.traverse(child => {
        if (child.isMesh && child.material?.transparent) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.05,
            metalness: 0.55,
            transparent: true,
            opacity: 0.90
          });
        }
      });
    }

  } else {
    // Default: 'wood' (Mahogany & Brass)
    if (!cachedTextures.woodBase) cachedTextures.woodBase = createProceduralWoodTexture();
    if (!cachedTextures.woodPark) cachedTextures.woodPark = createWoodParkTexture();

    const woodMat = new THREE.MeshStandardMaterial({
      map: cachedTextures.woodBase,
      roughness: 0.24,
      metalness: 0.06
    });

    if (dioramaMeshes.plinthMesh) dioramaMeshes.plinthMesh.material = woodMat;
    if (dioramaMeshes.earthMesh) dioramaMeshes.earthMesh.material = woodMat;
    if (dioramaMeshes.lipMesh) dioramaMeshes.lipMesh.material = woodMat;

    const brassCornerMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.22,
      metalness: 0.85
    });

    dioramaMeshes.cornerGroups.forEach(cg => {
      if (cg.children[0]) cg.children[0].material = brassCornerMat;
      if (cg.children[1]) cg.children[1].material = brassCornerMat;
      if (cg.children[2]) cg.children[2].material = brassCornerMat;
    });

    if (dioramaMeshes.rimMesh) {
      dioramaMeshes.rimMesh.material = new THREE.MeshStandardMaterial({
        color: 0xdde3ea,
        roughness: 0.55,
        metalness: 0.05
      });
    }

    if (dioramaMeshes.innerMesh) {
      dioramaMeshes.innerMesh.material = new THREE.MeshStandardMaterial({
        map: cachedTextures.woodPark,
        roughness: 0.65,
        metalness: 0.05
      });
    }

    dioramaMeshes.treeClusters.forEach(cluster => {
      cluster.traverse(child => {
        if (child.isMesh && child.geometry?.type === 'ConeGeometry') {
          child.material = new THREE.MeshLambertMaterial({
            color: 0x16a34a,
            flatShading: true
          });
        } else if (child.isMesh && child.geometry?.type === 'CylinderGeometry') {
          child.material = new THREE.MeshLambertMaterial({
            color: 0x78350f,
            flatShading: true
          });
        }
      });
    });

    if (dioramaMeshes.fountain) {
      dioramaMeshes.fountain.traverse(child => {
        if (child.isMesh && child.material?.transparent) {
          child.material = new THREE.MeshStandardMaterial({
            color: 0x06b6d4,
            roughness: 0.08,
            metalness: 0.45,
            transparent: true,
            opacity: 0.88
          });
        }
      });
    }
  }

  // 2. Refresh all 32 tiles with new textures and block side styling
  refreshAllTileTexturesAndMaterials();

  // 2B. Re-apply active edition centerpiece & texture (preserves Rajasthan desert vs World park)
  updateDioramaCenterForEdition(matchSettings?.boardEdition || 'world');

  // 3. Re-apply composite lighting and atmosphere matching the new board style
  const lighting = getSceneLighting();
  if (style === 'cyberpunk') {
    matchSettings.lightingTheme = 'day';
  }
  applyLightingMode(matchSettings.lightingTheme || 'day', lighting);
}
