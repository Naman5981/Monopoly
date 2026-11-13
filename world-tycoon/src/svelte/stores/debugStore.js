/**
 * svelte/stores/debugStore.js
 * Reactive Svelte 5 store for World Tycoon Developer & QA Testing Suite.
 */

import { writable } from 'svelte/store';
import { debugState, gameState } from '../../game/state.js';

const initialDebugState = {
  visible: false,
  activeTab: 'dice', // 'dice' | 'props' | 'players' | 'events' | 'scenarios'
  forcedD1: 1,
  forcedD2: 1,
  selectedTileId: 1,
  selectedPropId: 1,
  selectedPlayerIdx: 0,
  selectedGroup: 'brown',
  selectedChancePrize: 0,
  cashInput: 1000000,
  festivalPotInput: 500000,
  freezeAI: false
};

export const debugStore = writable(initialDebugState);

export function updateDebugStore(partial) {
  debugStore.update(s => ({ ...s, ...partial }));
}

export function toggleDebugStoreVisible(force = null) {
  debugStore.update(s => {
    const nextVis = force !== null ? force : !s.visible;
    return { ...s, visible: nextVis, freezeAI: Boolean(debugState?.freezeAI) };
  });
}

export function setDebugStoreTab(tab) {
  debugStore.update(s => ({ ...s, activeTab: tab }));
}
