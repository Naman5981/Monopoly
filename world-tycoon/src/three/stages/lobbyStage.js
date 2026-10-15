/**
 * three/stages/lobbyStage.js
 * Isolated 3D hero stage for the setup/landing screen:
 * floating grassy podium with miniature pine trees, red 3D dice, and rotating customizable avatar.
 */

import * as THREE from 'three';
import { PLAYER_THEMES } from '../../game/data.js';
import { createDetailed3DAvatarMesh } from '../assets/avatars.js';

let lobbyHeroScene = null;
let lobbyHeroCamera = null;
let lobbyHeroRenderer = null;
let lobbyHeroAvatarGroup = null;
let lobbyHeroPodiumGroup = null;
const lobbyHeroCanvasId = 'lobby-avatar-3d-canvas';

export function initLobbyHeroStage() {
  const canvas = document.getElementById(lobbyHeroCanvasId);
  if (!canvas) return;

  const w = 380;
  const h = 400;

  lobbyHeroScene = new THREE.Scene();
  lobbyHeroCamera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
  lobbyHeroCamera.position.set(0, 1.45, 5.0);
  lobbyHeroCamera.lookAt(0, 0.42, 0);

  lobbyHeroRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  lobbyHeroRenderer.setSize(w, h, false);
  lobbyHeroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Studio lighting
  const amb = new THREE.AmbientLight(0xffffff, 0.95);
  const dir = new THREE.DirectionalLight(0xfffbeb, 1.25);
  dir.position.set(4, 7, 5);
  lobbyHeroScene.add(amb, dir);

  // Floating Podium (Circular Grass Island with white rim)
  lobbyHeroPodiumGroup = new THREE.Group();
  lobbyHeroPodiumGroup.position.set(0, -0.62, 0);

  // White base plinth
  const rimGeo = new THREE.CylinderGeometry(1.65, 1.72, 0.22, 32);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = 0.11;
  lobbyHeroPodiumGroup.add(rimMesh);

  // Vibrant green grass top
  const grassGeo = new THREE.CylinderGeometry(1.58, 1.58, 0.24, 32);
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.55 });
  const grassMesh = new THREE.Mesh(grassGeo, grassMat);
  grassMesh.position.y = 0.13;
  lobbyHeroPodiumGroup.add(grassMesh);

  // Mini stylized trees on the grass
  function createMiniTree(x, z, s = 1) {
    const tree = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 0.35 * s, 8), trunkMat);
    trunk.position.y = (0.35 * s) / 2;
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.45, flatShading: true });
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.28 * s, 0.55 * s, 7), leavesMat);
    leaves.position.y = 0.35 * s + (0.55 * s) / 2;
    tree.add(trunk, leaves);
    tree.position.set(x, 0.25, z);
    return tree;
  }
  lobbyHeroPodiumGroup.add(createMiniTree(-1.18, -0.45, 1.1));
  lobbyHeroPodiumGroup.add(createMiniTree(-1.05, 0.35, 0.85));
  lobbyHeroPodiumGroup.add(createMiniTree(1.22, -0.38, 1.05));

  // Pair of red 3D dice on the grass
  function createMiniDice(x, z, rotY) {
    const diceMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25 });
    const die = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), diceMat);
    die.position.set(x, 0.36, z);
    die.rotation.set(0.05, rotY, 0.05);
    return die;
  }
  lobbyHeroPodiumGroup.add(createMiniDice(0.95, 0.48, 0.4));
  lobbyHeroPodiumGroup.add(createMiniDice(1.15, 0.38, -0.2));

  lobbyHeroScene.add(lobbyHeroPodiumGroup);

  // Avatar group
  lobbyHeroAvatarGroup = new THREE.Group();
  lobbyHeroAvatarGroup.position.set(0, -0.35, 0);
  lobbyHeroScene.add(lobbyHeroAvatarGroup);

  updateLobbyHeroAvatar(0, '#6c5ce7', 0x6c5ce7);
}

export function updateLobbyHeroAvatar(hatStyle = 0, colorHex = '#6c5ce7', charColor = 0x6c5ce7) {
  if (!lobbyHeroAvatarGroup) return;
  while (lobbyHeroAvatarGroup.children.length > 0) {
    lobbyHeroAvatarGroup.remove(lobbyHeroAvatarGroup.children[0]);
  }
  const mockIdx = (hatStyle || 0) % 4;
  PLAYER_THEMES[mockIdx].charColor = (typeof charColor === 'number') ? charColor : 0x6c5ce7;
  PLAYER_THEMES[mockIdx].colorHex = colorHex || '#6c5ce7';
  const avatarMesh = createDetailed3DAvatarMesh(mockIdx, false);
  avatarMesh.scale.setScalar(1.25);
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
    lobbyHeroAvatarGroup.rotation.y = Math.sin(t * 0.9) * 0.42;
    const ud = lobbyHeroAvatarGroup.children[0]?.userData;
    if (ud?.headGroup) {
      ud.headGroup.rotation.y = Math.sin(t * 1.8) * 0.15;
    }
  }
  if (lobbyHeroPodiumGroup) {
    lobbyHeroPodiumGroup.rotation.y = t * 0.15;
  }
  lobbyHeroRenderer.render(lobbyHeroScene, lobbyHeroCamera);
}
