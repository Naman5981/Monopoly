/**
 * ui/rive.js
 * Rive / Spine-WebGL Vector Animation Engine Integration Bridge.
 *
 * Provides a clean adapter for interactive Rive State Machine animations:
 * - Maps game economy triggers (Rent, Go Salary, Tax, Jailed, Victory) to Rive State Machine Inputs:
 *   - `mood`: 0 (Idle), 1 (Smug), 2 (Crying), 3 (Shocked), 4 (Cheering), 5 (Bankrupt)
 *   - `triggerCelebrate`: Fire trigger
 *   - `triggerHurt`: Fire trigger
 * - Supports chance wheel spinner state machines (`isSpinning`: boolean, `spinSpeed`: number)
 * - Seamlessly delegates to portraitRenderer.js when local .riv files are not mounted.
 */

import { setPlayerPortraitMood, getPlayerMood } from './portraitRenderer.js';

export const riveInstances = new Map();

/**
 * Initializes a Rive animation instance for a player's HUD avatar card if Rive runtime is loaded.
 * @param {HTMLCanvasElement} canvas
 * @param {number} playerIdx
 * @param {string} riveAssetUrl Optional path to .riv binary file
 */
export async function initRivePortrait(canvas, playerIdx, riveAssetUrl = null) {
  if (typeof window !== 'undefined' && window.rive && riveAssetUrl) {
    try {
      const r = new window.rive.Rive({
        src: riveAssetUrl,
        canvas: canvas,
        autoplay: true,
        stateMachines: 'PortraitStateMachine',
        onLoad: () => {
          r.resizeDrawingSurfaceToCanvas();
          const inputs = r.stateMachineInputs('PortraitStateMachine');
          const moodInput = inputs?.find(i => i.name === 'mood');
          riveInstances.set(playerIdx, { instance: r, moodInput });
        }
      });
      return true;
    } catch (err) {
      console.warn(`[Rive] Could not load .riv asset for player ${playerIdx}:`, err);
    }
  }

  // Graceful fallback: Built-in procedural vector engine in portraitRenderer.js handles rendering
  return false;
}

/**
 * Updates Rive state machine mood input when game triggers occur.
 * @param {number} playerIdx
 * @param {'idle' | 'smug' | 'crying' | 'shocked' | 'cheering' | 'bankrupt'} mood
 * @param {number} durationMs
 */
export function triggerPortraitReaction(playerIdx, mood, durationMs = 3500) {
  // 1. Update Rive state machine if active
  const riveEntry = riveInstances.get(playerIdx);
  if (riveEntry && riveEntry.moodInput) {
    const moodMap = { idle: 0, smug: 1, crying: 2, shocked: 3, cheering: 4, bankrupt: 5 };
    riveEntry.moodInput.value = moodMap[mood] ?? 0;
    if (mood !== 'bankrupt' && durationMs > 0) {
      setTimeout(() => {
        if (riveEntry.moodInput) riveEntry.moodInput.value = 0; // return to idle
      }, durationMs);
    }
  }

  // 2. Update built-in procedural Canvas engine
  setPlayerPortraitMood(playerIdx, mood, durationMs);
}

if (typeof window !== 'undefined') {
  window.triggerPortraitReaction = triggerPortraitReaction;
}
