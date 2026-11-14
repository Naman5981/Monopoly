/**
 * svelte/stores/bannerStore.js
 * Declarative Svelte store for in-game celebration, alert, and event banners.
 * Replaces imperative document.createElement DOM manipulation with reactive Svelte architecture.
 */

import { writable } from 'svelte/store';

const initialBannerState = {
  activeBanner: null, // 'eliminated' | 'takeover' | 'doubles' | 'boardingPass' | 'monopoly' | 'monopolyThreat' | null
  data: {}
};

export const bannerStore = writable(initialBannerState);

let bannerDismissTimer = null;

/**
 * Triggers a declarative banner overlay in Svelte.
 * @param {'eliminated'|'takeover'|'doubles'|'boardingPass'|'monopoly'|'monopolyThreat'} type
 * @param {object} data
 * @param {number} [durationMs=2400]
 */
export function triggerBanner(type, data = {}, durationMs = 2400) {
  if (bannerDismissTimer) {
    clearTimeout(bannerDismissTimer);
    bannerDismissTimer = null;
  }

  bannerStore.set({
    activeBanner: type,
    data: { ...data }
  });

  if (durationMs > 0) {
    bannerDismissTimer = setTimeout(() => {
      dismissBanner();
    }, durationMs);
  }
}

/**
 * Dismisses the active banner overlay.
 */
export function dismissBanner() {
  if (bannerDismissTimer) {
    clearTimeout(bannerDismissTimer);
    bannerDismissTimer = null;
  }
  bannerStore.set({
    activeBanner: null,
    data: {}
  });
}
