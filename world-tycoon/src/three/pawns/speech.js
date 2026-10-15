/**
 * three/pawns/speech.js
 * Speech and reaction emote bubbles floating dynamically above player pawns with screen projection.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { gameState } from '../../game/state.js';

let hideBubbleTimer = null;

/**
 * Projects 3D world position of active player token onto 2D screen coordinates and repositions the bubble.
 */
export function updateSpeechBubbleScreenPosition() {
  const bubble = document.getElementById('token-speech-bubble');
  if (!bubble || bubble.classList.contains('hidden')) return;

  const activeMesh = context.playerMeshes[gameState.currentPlayerIdx];
  if (!activeMesh || !context.camera) return;

  const worldPos = new THREE.Vector3();
  activeMesh.getWorldPosition(worldPos);
  worldPos.y += 1.85;
  worldPos.project(context.camera);

  bubble.style.left = `${(worldPos.x * 0.5 + 0.5) * window.innerWidth}px`;
  bubble.style.top = `${(-worldPos.y * 0.5 + 0.5) * window.innerHeight}px`;
}

/**
 * Displays speech text / emote reaction anchored to the current player's token.
 * @param {string} text
 * @param {number} duration - Time in milliseconds before auto-hide
 */
export function showSpeechBubble(text, duration = 2600) {
  const bubble = document.getElementById('token-speech-bubble');
  if (!bubble) return;
  bubble.textContent = text;
  bubble.classList.remove('hidden');
  updateSpeechBubbleScreenPosition();

  if (hideBubbleTimer) clearTimeout(hideBubbleTimer);
  hideBubbleTimer = setTimeout(() => {
    bubble.classList.add('hidden');
  }, duration);
}
