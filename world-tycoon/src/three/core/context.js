/**
 * three/core/context.js
 * Centralized Three.js runtime state and shared resource registry.
 */

import * as THREE from 'three';
export { disposeHierarchy, disposeMaterial } from './dispose.js';

export const context = {
  // Primary Three.js singletons
  scene: null,
  camera: null,
  renderer: null,
  raycaster: null,
  mouseVec: null,
  boardGroup: null,
  container: null,

  // Render & projection constants
  frustumSize: 31.5,
  maxAnisotropy: 4,

  // Mesh & group registries
  tilesMeshMap: {},
  tileBuildingGroups: {},
  cornerLandmarkGroups: {},
  playerMeshes: [],
  diceMeshes: [],
  tileHighlightRing: null,
  tileBorderFrames: {},
  tileGroundLightPools: {},
  activeTileIlluminations: {},
  activeTileDepressions: {},
  hoveredTileId: null,

  // Dynamic lights
  ambientLight: null,
  dirLight: null,
  hemiLight: null,
  tilePressPointLight: null,

  // Callbacks
  onTileClick: () => {},
  onHoverChange: () => {},

  // State reset for remounts
  reset() {
    this.tilesMeshMap = {};
    this.tileBuildingGroups = {};
    this.cornerLandmarkGroups = {};
    this.playerMeshes = [];
    this.diceMeshes = [];
    this.tileHighlightRing = null;
    this.tileBorderFrames = {};
    this.tileGroundLightPools = {};
    this.activeTileIlluminations = {};
    this.activeTileDepressions = {};
    this.hoveredTileId = null;
  }
};
