/**
 * three/pawns/speech.js
 * Speech and reaction emote bubbles floating dynamically above player pawns with screen projection.
 */

import * as THREE from 'three';
import { context } from '../core/context.js';
import { gameState } from '../../game/state.js';

let hideBubbleTimer = null;
const projectedWorldPos = new THREE.Vector3();

/**
 * Projects 3D world position of active player token onto 2D screen coordinates and repositions the bubble.
 */
export function updateSpeechBubbleScreenPosition() {
  const bubble = document.getElementById('token-speech-bubble');
  if (!bubble || bubble.classList.contains('hidden')) return;

  const activeMesh = context.playerMeshes[gameState.currentPlayerIdx];
  if (!activeMesh || !context.camera) return;

  activeMesh.getWorldPosition(projectedWorldPos);
  projectedWorldPos.y += 1.85;
  projectedWorldPos.project(context.camera);

  const screenX = Math.round((projectedWorldPos.x * 0.5 + 0.5) * window.innerWidth);
  const screenY = Math.round((-projectedWorldPos.y * 0.5 + 0.5) * window.innerHeight);

  bubble.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) translate(-50%, -100%)`;
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
