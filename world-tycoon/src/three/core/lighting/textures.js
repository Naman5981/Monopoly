/**
 * three/core/lighting/textures.js
 * Procedural canvas textures for soft bloom glow, ground light pools, and street light cones.
 */

import * as THREE from 'three';

let softBloomTexture = null;

/**
 * Procedural 256x256 radial glow sprite texture for filament and bulb bloom.
 */
export function getSoftBloomTexture() {
  if (softBloomTexture) return softBloomTexture;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.14, 'rgba(255, 252, 240, 0.95)');
  grad.addColorStop(0.35, 'rgba(255, 244, 218, 0.65)');
  grad.addColorStop(0.60, 'rgba(254, 235, 195, 0.28)');
  grad.addColorStop(0.82, 'rgba(253, 224, 175, 0.08)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  softBloomTexture = new THREE.CanvasTexture(c);
  return softBloomTexture;
}

let groundPoolTexture = null;

/**
 * Procedural 512x512 soft radial gradient texture for ground illumination pools.
 */
export function getGroundPoolTexture() {
  if (groundPoolTexture) return groundPoolTexture;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.90)');
  grad.addColorStop(0.20, 'rgba(255, 250, 235, 0.72)');
  grad.addColorStop(0.45, 'rgba(254, 240, 210, 0.38)');
  grad.addColorStop(0.72, 'rgba(253, 230, 180, 0.10)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  groundPoolTexture = new THREE.CanvasTexture(c);
  return groundPoolTexture;
}

let beamGradientTexture = null;

/**
 * Procedural 64x256 linear gradient texture for volumetric light cone beams.
 */
export function getBeamGradientTexture() {
  if (beamGradientTexture) return beamGradientTexture;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255, 250, 205, 0.85)');
  grad.addColorStop(0.25, 'rgba(254, 240, 138, 0.45)');
  grad.addColorStop(0.7, 'rgba(253, 224, 71, 0.15)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);
  beamGradientTexture = new THREE.CanvasTexture(c);
  return beamGradientTexture;
}
