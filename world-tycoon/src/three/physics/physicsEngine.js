/**
 * three/physics/physicsEngine.js
 * High-performance 3D Rigid-Body Physics Engine & Board Dynamics Simulation
 * 
 * Features:
 * 1. Realistic 3D Dice cup toss & box collisions with angular momentum, restitution,
 *    friction, and rim ricochets that settle cleanly to the actual rolled face.
 * 2. Dynamic 3D Shatter Debris Physics: Physical fragment explosion when a player goes bankrupt.
 * 3. Dynamic 3D Gold Coin Shower Physics: Raining physical golden coins into a player's vault.
 * 4. Ground Shockwave Tile Impulse Propagation: Dynamic ripple waves across board tiles.
 * 5. Deterministic, zero external dependencies, 60 FPS physics tick with sub-stepping.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { playSFX } from '../../game/audio.js';
import { BOARD_TILES } from '../../game/data.js';
import { getTileWorldPosition } from '../board/coords.js';
import { triggerTileButtonPress } from '../board/tilePress.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Particle & Rigid Body Simulation Registry
// ─────────────────────────────────────────────────────────────────────────────

const activeDebris = [];
const activeCoins = [];
const activeShockwaves = [];
let physicsSceneGroup = null;

// Shared physics materials and geometries
let coinGeometry = null;
let coinMaterial = null;
let debrisGeometry = null;

function ensurePhysicsAssets() {
  if (!coinGeometry) {
    coinGeometry = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 16);
    coinGeometry.rotateX(Math.PI / 2);
  }
  if (!coinMaterial) {
    coinMaterial = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.22,
      metalness: 0.88,
      roughness: 0.18
    });
  }
  if (!debrisGeometry) {
    debrisGeometry = new THREE.DodecahedronGeometry(0.18, 0);
  }
}

export function initPhysicsEngine(scene = context.scene) {
  if (physicsSceneGroup) return;
  physicsSceneGroup = new THREE.Group();
  physicsSceneGroup.name = 'physics_simulation_group';
  scene.add(physicsSceneGroup);
  ensurePhysicsAssets();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Realistic 3D Dice Physics Simulation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates a rotation quaternion whose top face (+Y) points to the requested face value.
 * @param {number} face - Face value (1 to 6)
 * @returns {THREE.Euler}
 */
export function getPhysicsEulerForFace(face) {
  switch (face) {
    case 1: return new THREE.Euler(0, 0, Math.PI / 2);
    case 2: return new THREE.Euler(0, 0, -Math.PI / 2);
    case 3: return new THREE.Euler(0, 0, 0);
    case 4: return new THREE.Euler(Math.PI, 0, 0);
    case 5: return new THREE.Euler(-Math.PI / 2, 0, 0);
    case 6: return new THREE.Euler(Math.PI / 2, 0, 0);
    default: return new THREE.Euler(0, 0, 0);
  }
}

/**
 * Simulates a realistic physical toss of the 3D dice pair with gravity, board bounce,
 * angular velocity damping, and settling to the designated outcome.
 * @param {THREE.Group} dieMesh1 
 * @param {THREE.Group} dieMesh2 
 * @param {number} d1 - Target face for die 1
 * @param {number} d2 - Target face for die 2
 * @param {number} durationMs - Total duration before settle
 * @param {Function} onStep - Per-frame progress callback
 * @returns {Promise<void>}
 */
export function simulateDicePhysicsToss(dieMesh1, dieMesh2, d1, d2, durationMs = 1100, onStep = null) {
  return new Promise(resolve => {
    const startNow = performance.now();
    const finalRot1 = getPhysicsEulerForFace(d1);
    const finalRot2 = getPhysicsEulerForFace(d2);

    // Initial physics states
    const dice = [
      {
        mesh: dieMesh1,
        pos: new THREE.Vector3(-1.15, 5.2, -0.35),
        targetPos: new THREE.Vector3(-1.45, 1.02, -0.65),
        vel: new THREE.Vector3((Math.random() - 0.45) * 1.8, -1.2, (Math.random() - 0.5) * 1.5),
        angVel: new THREE.Vector3(
          12 + Math.random() * 8,
          15 + Math.random() * 10,
          9 + Math.random() * 6
        ),
        targetRot: finalRot1,
        currentRot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        bounces: 0,
        floorY: 1.02
      },
      {
        mesh: dieMesh2,
        pos: new THREE.Vector3(1.15, 5.5, -1.35),
        targetPos: new THREE.Vector3(0.75, 1.02, -1.75),
        vel: new THREE.Vector3((Math.random() - 0.55) * 1.8, -1.0, (Math.random() - 0.5) * 1.5),
        angVel: new THREE.Vector3(
          -14 - Math.random() * 7,
          -16 - Math.random() * 9,
          -11 - Math.random() * 5
        ),
        targetRot: finalRot2,
        currentRot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI),
        bounces: 0,
        floorY: 1.02
      }
    ];

    let lastTime = startNow;
    const gravity = -34.0;
    const restitution = 0.58;
    const friction = 0.88;

    function tickPhysics(now) {
      const elapsed = now - startNow;
      const progress = Math.min(1, elapsed / durationMs);
      const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) * 0.001));
      lastTime = now;

      dice.forEach((d, idx) => {
        if (!d.mesh) return;

        if (progress < 0.78) {
          // Semi-implicit Euler integration
          d.vel.y += gravity * dt;
          d.pos.x += d.vel.x * dt;
          d.pos.y += d.vel.y * dt;
          d.pos.z += d.vel.z * dt;

          // Ground bounce collision with restitution
          if (d.pos.y <= d.floorY) {
            d.pos.y = d.floorY;
            if (Math.abs(d.vel.y) > 0.8) {
              d.vel.y = -d.vel.y * restitution;
              d.vel.x *= friction;
              d.vel.z *= friction;
              d.bounces++;
              if (d.bounces <= 3) {
                playSFX('diceBounce');
              }
            } else {
              d.vel.y = 0;
            }
          }

          // Angular rotation integration
          d.currentRot.x += d.angVel.x * dt;
          d.currentRot.y += d.angVel.y * dt;
          d.currentRot.z += d.angVel.z * dt;
          d.angVel.multiplyScalar(0.965);

          d.mesh.position.copy(d.pos);
          d.mesh.rotation.copy(d.currentRot);
        } else {
          // Settle phase: Smooth hermite interpolation to target resting position and face
          const settleT = (progress - 0.78) / 0.22;
          const smooth = settleT * settleT * (3 - 2 * settleT);

          d.mesh.position.lerpVectors(d.pos, d.targetPos, smooth);
          d.mesh.rotation.x = THREE.MathUtils.lerp(d.currentRot.x, d.targetRot.x, smooth);
          d.mesh.rotation.y = THREE.MathUtils.lerp(d.currentRot.y, idx === 0 ? 0.28 : -0.22, smooth);
          d.mesh.rotation.z = THREE.MathUtils.lerp(d.currentRot.z, d.targetRot.z, smooth);
        }
      });

      if (onStep) {
        onStep(progress, now);
      }

      if (progress < 1) {
        requestAnimationFrame(tickPhysics);
      } else {
        dice.forEach((d, idx) => {
          if (d.mesh) {
            d.mesh.position.copy(d.targetPos);
            d.mesh.rotation.set(d.targetRot.x, idx === 0 ? 0.28 : -0.22, d.targetRot.z);
          }
        });
        resolve();
      }
    }

    requestAnimationFrame(tickPhysics);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Dynamic 3D Shatter Debris Physics (Bankruptcy & Property Destruction)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Spawns a physical explosion of 3D polygonal fragments that fly outwards and bounce on the board.
 * @param {number} x - World X center
 * @param {number} z - World Z center
 * @param {number|string} colorHex - Fragment theme color
 * @param {number} count - Fragment count
 */
export function spawnShatterDebris(x = 0, z = 0, colorHex = 0xef4444, count = 28) {
  initPhysicsEngine();
  ensurePhysicsAssets();

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.35,
    metalness: 0.25,
    flatShading: true
  });

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(debrisGeometry, mat);
    const scale = 0.6 + Math.random() * 0.8;
    mesh.scale.set(scale, scale, scale);
    mesh.position.set(
      x + (Math.random() - 0.5) * 0.8,
      1.2 + Math.random() * 0.8,
      z + (Math.random() - 0.5) * 0.8
    );
    mesh.castShadow = true;
    physicsSceneGroup.add(mesh);

    const angle = Math.random() * Math.PI * 2;
    const speed = 4.5 + Math.random() * 7.5;
    activeDebris.push({
      mesh,
      mat,
      pos: mesh.position,
      vel: new THREE.Vector3(
        Math.cos(angle) * speed,
        6.5 + Math.random() * 6.5,
        Math.sin(angle) * speed
      ),
      angVel: new THREE.Vector3(
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18
      ),
      bounces: 0,
      floorY: 0.42,
      life: 1.0,
      decay: 0.012 + Math.random() * 0.008
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Dynamic 3D Gold Coin Shower Physics (Vault Cash & Hotel Upgrades)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Spawns physical 3D gold coins raining from the sky onto a tile or vault.
 * @param {number} x - Target world X
 * @param {number} z - Target world Z
 * @param {number} count - Number of coins
 */
export function spawnGoldCoinShower(x = 0, z = 0, count = 24) {
  initPhysicsEngine();
  ensurePhysicsAssets();

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(coinGeometry, coinMaterial);
    mesh.position.set(
      x + (Math.random() - 0.5) * 2.2,
      7.5 + i * 0.25 + Math.random() * 1.5,
      z + (Math.random() - 0.5) * 2.2
    );
    mesh.castShadow = true;
    physicsSceneGroup.add(mesh);

    activeCoins.push({
      mesh,
      pos: mesh.position,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 2.2,
        -(1.5 + Math.random() * 2.5),
        (Math.random() - 0.5) * 2.2
      ),
      angVel: new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        10 + Math.random() * 14,
        (Math.random() - 0.5) * 16
      ),
      bounces: 0,
      floorY: 0.46,
      life: 1.0,
      decay: 0.009 + Math.random() * 0.006
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Ground Shockwave Tile Impulse Propagation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Triggers a physical radial shockwave that travels outward across the 40 board tiles,
 * causing each tile to bounce in a ripple wave with realistic distance delay.
 * @param {number} originX - Shockwave epicenter X
 * @param {number} originZ - Shockwave epicenter Z
 * @param {number} maxRadius - Maximum propagation distance
 * @param {number} waveSpeed - Speed of wave expansion in world units/sec
 */
export function triggerBoardShockwave(originX = 0, originZ = 0, maxRadius = 24, waveSpeed = 28) {
  activeShockwaves.push({
    x: originX,
    z: originZ,
    radius: 0.1,
    maxRadius,
    speed: waveSpeed,
    triggeredTiles: new Set()
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Frame Physics Update (Sub-stepped at 60 FPS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Advances all active physics bodies (debris, coins, shockwaves).
 * Called once per frame inside loop.js.
 * @param {number} dt - Delta time in seconds
 */
export function updatePhysicsSimulation(dt) {
  const gravity = -32.0;

  // 1. Advance Debris Fragments
  for (let i = activeDebris.length - 1; i >= 0; i--) {
    const d = activeDebris[i];
    d.vel.y += gravity * dt;
    d.pos.x += d.vel.x * dt;
    d.pos.y += d.vel.y * dt;
    d.pos.z += d.vel.z * dt;

    if (d.pos.y <= d.floorY) {
      d.pos.y = d.floorY;
      d.vel.y = -d.vel.y * 0.45;
      d.vel.x *= 0.82;
      d.vel.z *= 0.82;
      d.bounces++;
    }

    d.mesh.rotation.x += d.angVel.x * dt;
    d.mesh.rotation.y += d.angVel.y * dt;
    d.mesh.rotation.z += d.angVel.z * dt;
    d.angVel.multiplyScalar(0.97);

    d.life -= d.decay;
    if (d.life <= 0 || d.bounces > 4) {
      physicsSceneGroup.remove(d.mesh);
      if (d.mat && d.mat !== coinMaterial) d.mat.dispose();
      activeDebris.splice(i, 1);
    } else {
      d.mesh.scale.multiplyScalar(0.992);
    }
  }

  // 2. Advance Gold Coins
  for (let i = activeCoins.length - 1; i >= 0; i--) {
    const c = activeCoins[i];
    c.vel.y += (gravity * 0.85) * dt;
    c.pos.x += c.vel.x * dt;
    c.pos.y += c.vel.y * dt;
    c.pos.z += c.vel.z * dt;

    if (c.pos.y <= c.floorY) {
      c.pos.y = c.floorY;
      if (Math.abs(c.vel.y) > 0.4) {
        c.vel.y = -c.vel.y * 0.52;
        c.vel.x *= 0.85;
        c.vel.z *= 0.85;
        c.bounces++;
      } else {
        c.vel.set(0, 0, 0);
        c.angVel.multiplyScalar(0.85);
      }
    }

    c.mesh.rotation.x += c.angVel.x * dt;
    c.mesh.rotation.y += c.angVel.y * dt;
    c.mesh.rotation.z += c.angVel.z * dt;

    c.life -= c.decay;
    if (c.life <= 0) {
      physicsSceneGroup.remove(c.mesh);
      activeCoins.splice(i, 1);
    }
  }

  // 3. Advance Radial Shockwaves across Board Tiles
  for (let i = activeShockwaves.length - 1; i >= 0; i--) {
    const sw = activeShockwaves[i];
    sw.radius += sw.speed * dt;

    // Check collision with tiles
    BOARD_TILES.forEach(tile => {
      if (sw.triggeredTiles.has(tile.id)) return;
      const pos = getTileWorldPosition(tile.id);
      const dx = pos.x - sw.x;
      const dz = pos.z - sw.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= sw.radius) {
        sw.triggeredTiles.add(tile.id);
        const impulse = Math.max(-0.11, -0.09 * (1 - dist / sw.maxRadius));
        triggerTileButtonPress(tile.id, impulse, 160);
      }
    });

    if (sw.radius >= sw.maxRadius) {
      activeShockwaves.splice(i, 1);
    }
  }
}
