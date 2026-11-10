/**
 * three/stages/lobbyStage.js
 * Executive 3D Hero Stage for the Setup/Landing Screen:
 * Architectural luxury marble & brass exhibition plinth,
 * precision casino dice, gold bullion ingots, and dynamic three-point studio lighting.
 *
 * Refactored under /anti-ui-slop and /better-interface standards:
 * - Replaced childish green grass and cone trees with an architectural museum pedestal
 * - Clean brushed brass inlay chamfers, polished marble floor, and warm ambient under-glow
 * - Three-point studio lighting with key, fill, and rim lights for high-end specular pop
 */

import * as THREE from 'three';
import { createDetailed3DAvatarMesh } from '../assets/avatars.js';
import { DICE_SKIN_PALETTES } from '../assets/dice.js';

let lobbyHeroScene = null;
let lobbyHeroCamera = null;
let lobbyHeroRenderer = null;
let lobbyHeroAvatarGroup = null;
let lobbyHeroPodiumGroup = null;
let lobbyHeroMiniDice = [];
const lobbyHeroCanvasId = 'lobby-avatar-3d-canvas';

export function resizeLobbyHeroStage() {
  const canvas = document.getElementById(lobbyHeroCanvasId);
  if (!canvas || !lobbyHeroRenderer || !lobbyHeroCamera) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
  const displayW = Math.max(rect.width || 380, 180);
  const displayH = Math.max(rect.height || 400, 180);
  const targetW = Math.round(displayW * dpr);
  const targetH = Math.round(displayH * dpr);

  if (canvas.width !== targetW || canvas.height !== targetH) {
    lobbyHeroRenderer.setSize(targetW, targetH, false);
    const aspect = targetW / targetH;
    lobbyHeroCamera.aspect = aspect;
    // Maintain complete stage headroom and plinth visibility even on narrow aspect ratios
    lobbyHeroCamera.fov = aspect < 1.0 ? Math.min(48, 38 / Math.max(aspect, 0.65)) : 38;
    lobbyHeroCamera.updateProjectionMatrix();
  }
}

export function initLobbyHeroStage() {
  const canvas = document.getElementById(lobbyHeroCanvasId);
  if (!canvas) return;

  const w = 512;
  const h = 512;

  lobbyHeroScene = new THREE.Scene();
  // Camera framed with balanced headroom above the tallest hat and clean floor margin below the plinth
  lobbyHeroCamera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
  lobbyHeroCamera.position.set(0, 1.20, 5.4);
  lobbyHeroCamera.lookAt(0, 0.44, 0);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
  }, false);
  canvas.addEventListener('webglcontextrestored', () => {
    if (lobbyHeroRenderer) {
      resizeLobbyHeroStage();
    }
  }, false);

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', resizeLobbyHeroStage, { passive: true });
  }

  try {
    lobbyHeroRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    lobbyHeroRenderer.setSize(w, h, false);
    lobbyHeroRenderer.setPixelRatio(Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2));
    lobbyHeroRenderer.shadowMap.enabled = true;
    lobbyHeroRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  } catch (err) {
    return;
  }

  requestAnimationFrame(resizeLobbyHeroStage);

  // Studio Three-Point Lighting (Key, Fill, and Rim Backlight)
  const amb = new THREE.AmbientLight(0xe2e8f0, 0.85);
  lobbyHeroScene.add(amb);

  // Key Light (Warm Champagne)
  const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.5);
  keyLight.position.set(3.8, 6.8, 4.8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.001;
  lobbyHeroScene.add(keyLight);

  // Fill Light (Cool Slate)
  const fillLight = new THREE.DirectionalLight(0xcfd8dc, 0.65);
  fillLight.position.set(-4.0, 3.5, 2.0);
  lobbyHeroScene.add(fillLight);

  // Rim Backlight (Crisp Edge Silhouette)
  const rimLight = new THREE.DirectionalLight(0xffffff, 1.25);
  rimLight.position.set(-0.5, 4.5, -4.5);
  lobbyHeroScene.add(rimLight);

  // Luxury Architectural Exhibition Plinth
  lobbyHeroPodiumGroup = new THREE.Group();
  lobbyHeroPodiumGroup.position.set(0, -0.58, 0);

  // Tier 1: Dark Obsidian/Slate Chamfered Plinth Base
  const basePlinthGeo = new THREE.CylinderGeometry(1.42, 1.50, 0.16, 48);
  const basePlinthMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.32,
    metalness: 0.35
  });
  const basePlinth = new THREE.Mesh(basePlinthGeo, basePlinthMat);
  basePlinth.position.y = 0.08;
  basePlinth.receiveShadow = true;
  lobbyHeroPodiumGroup.add(basePlinth);

  // Tier 2: Brushed Champagne Gold Metallic Inlay Ring
  const goldTrimGeo = new THREE.CylinderGeometry(1.38, 1.38, 0.03, 48);
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.18,
    metalness: 0.90
  });
  const goldTrim = new THREE.Mesh(goldTrimGeo, goldTrimMat);
  goldTrim.position.y = 0.17;
  lobbyHeroPodiumGroup.add(goldTrim);

  // Tier 3: Polished Carrara White Marble Platform
  const marbleTopGeo = new THREE.CylinderGeometry(1.34, 1.34, 0.16, 48);
  const marbleTopMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.16,
    metalness: 0.08
  });
  const marbleTop = new THREE.Mesh(marbleTopGeo, marbleTopMat);
  marbleTop.position.y = 0.22;
  marbleTop.receiveShadow = true;
  lobbyHeroPodiumGroup.add(marbleTop);

  // Subtle Warm Gold Under-Glow Halo
  const glowGeo = new THREE.TorusGeometry(1.32, 0.02, 12, 48);
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.75,
    roughness: 0.2,
    metalness: 0.8
  });
  const glowRing = new THREE.Mesh(glowGeo, glowMat);
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.30;
  lobbyHeroPodiumGroup.add(glowRing);

  // Plinth Accents: Stacks of 24K Gold Bullion Bars
  function createGoldIngot(x, y, z, rotY = 0) {
    const ingotGeo = new THREE.BoxGeometry(0.20, 0.06, 0.11);
    const ingotMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.92,
      roughness: 0.15
    });
    const ingot = new THREE.Mesh(ingotGeo, ingotMat);
    ingot.position.set(x, y, z);
    ingot.rotation.y = rotY;
    ingot.castShadow = true;
    return ingot;
  }

  // Left side bullion pyramid resting on marble
  lobbyHeroPodiumGroup.add(createGoldIngot(-0.92, 0.33, 0.10, 0.25));
  lobbyHeroPodiumGroup.add(createGoldIngot(-0.89, 0.33, -0.06, 0.18));
  lobbyHeroPodiumGroup.add(createGoldIngot(-0.905, 0.39, 0.02, 0.22));

  // Right side casino-grade precision dice
  function createMiniDice(x, z, rotY) {
    const diceMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.20,
      metalness: 0.15
    });
    const die = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.20, 0.20), diceMat);
    die.position.set(x, 0.40, z);
    die.rotation.set(0.08, rotY, 0.05);
    die.castShadow = true;
    return die;
  }
  const die1 = createMiniDice(0.85, 0.25, 0.42);
  const die2 = createMiniDice(0.98, 0.05, -0.28);
  lobbyHeroMiniDice = [die1, die2];
  lobbyHeroPodiumGroup.add(die1, die2);

  lobbyHeroScene.add(lobbyHeroPodiumGroup);

  // Avatar group
  lobbyHeroAvatarGroup = new THREE.Group();
  lobbyHeroAvatarGroup.position.set(0, -0.28, 0);
  lobbyHeroScene.add(lobbyHeroAvatarGroup);

  updateLobbyHeroAvatar(0, '#6c5ce7', 0x6c5ce7);
}

export function updateLobbyHeroDiceSkin(skinId = 'dice_classic') {
  if (!lobbyHeroMiniDice || lobbyHeroMiniDice.length === 0) return;
  const palette = DICE_SKIN_PALETTES[skinId] || DICE_SKIN_PALETTES.dice_classic;
  const col = new THREE.Color(palette.bg);
  lobbyHeroMiniDice.forEach(die => {
    if (die && die.material) {
      die.material.color = col;
      if (skinId === 'dice_midas') {
        die.material.metalness = 0.90;
        die.material.roughness = 0.18;
        die.material.emissive = new THREE.Color(0x713f12);
        die.material.emissiveIntensity = 0.25;
      } else if (skinId === 'dice_obsidian') {
        die.material.metalness = 0.50;
        die.material.roughness = 0.14;
        die.material.emissive = new THREE.Color(0x581c87);
        die.material.emissiveIntensity = 0.35;
      } else if (skinId === 'dice_neon') {
        die.material.metalness = 0.35;
        die.material.roughness = 0.18;
        die.material.emissive = new THREE.Color(0x0284c7);
        die.material.emissiveIntensity = 0.45;
      } else if (skinId === 'dice_ruby') {
        die.material.metalness = 0.30;
        die.material.roughness = 0.18;
        die.material.emissive = new THREE.Color(0x991b1b);
        die.material.emissiveIntensity = 0.30;
      } else {
        die.material.metalness = 0.10;
        die.material.roughness = 0.28;
        die.material.emissive = new THREE.Color(0x000000);
        die.material.emissiveIntensity = 0;
      }
      die.material.needsUpdate = true;
    }
  });
}

export function updateLobbyHeroAvatar(hatStyle = 0, colorHex = '#6c5ce7', charColor = 0x6c5ce7, pedestalStyle = null) {
  if (!lobbyHeroAvatarGroup) return;
  while (lobbyHeroAvatarGroup.children.length > 0) {
    lobbyHeroAvatarGroup.remove(lobbyHeroAvatarGroup.children[0]);
  }
  const parsedCharColor = (typeof charColor === 'number')
    ? charColor
    : (colorHex ? parseInt(colorHex.replace('#', '0x'), 16) : 0x6c5ce7);
  const avatarMesh = createDetailed3DAvatarMesh(0, false, hatStyle, pedestalStyle, parsedCharColor);
  avatarMesh.scale.setScalar(1.02);
  lobbyHeroAvatarGroup.add(avatarMesh);
}

/**
 * Per-frame render tick for the spinning lobby hero stage.
 * @param {number} t - Current time in seconds
 */
export function renderLobbyHeroStage(t) {
  if (!lobbyHeroRenderer || !lobbyHeroScene || !lobbyHeroCamera) return;
  const canvas = document.getElementById(lobbyHeroCanvasId);
  const landing = document.getElementById('landing-setup-screen');
  if (!canvas || !landing || landing.classList.contains('hidden') || landing.style.display === 'none') return;

  if (lobbyHeroAvatarGroup) {
    lobbyHeroAvatarGroup.rotation.y = Math.sin(t * 0.85) * 0.38;
    const ud = lobbyHeroAvatarGroup.children[0]?.userData;
    if (ud?.headGroup) {
      ud.headGroup.rotation.y = Math.sin(t * 1.6) * 0.12;
    }
  }
  if (lobbyHeroPodiumGroup) {
    lobbyHeroPodiumGroup.rotation.y = t * 0.12;
  }
  lobbyHeroRenderer.render(lobbyHeroScene, lobbyHeroCamera);
}
