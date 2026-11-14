/**
 * svelte/stores/hudStore.js
 * Central reactive HUD store for World Tycoon.
 * Bridges game engine state to reactive Svelte HUD components.
 */

import { writable } from 'svelte/store';

const initialHudState = {
  clock: '00:00',
  gameSpeed: 1,
  monopolySets: '0/3 Sets',
  playerCount: '2/2',
  roomCode: '',
  isMultiplayer: false,
  isHost: false,
  lightingMode: 'Day',
  soundVolume: 75,
  soundEnabled: true,
  statusPill: {
    text: 'Welcome to World Tycoon! Roll to start.',
    dotColor: '#10b981',
    isThinking: false,
    icon: '🎲',
    visible: true
  },
  turnTimeLeft: 15,
  turnMax: 15,
  turnTimerOffset: 0,
  rollButton: {
    visible: false,
    label: 'Roll',
    enabled: false
  },
  bailButton: {
    visible: false,
    label: 'Pay 150K Bail',
    canAfford: false
  },
  leftPlayers: [],
  rightPlayers: [],
  isTeamMode: false,
  leftTeamNetWorth: '$0',
  rightTeamNetWorth: '$0',
  leftTeamLabel: 'TEAM RED',
  rightTeamLabel: 'TEAM BLUE',
  leftTeamColor: '#ef4444',
  rightTeamColor: '#3b82f6',
  toast: {
    visible: false,
    text: ''
  },
  isEventLogOpen: false,
  isEmotePopoverOpen: false
};

export const hudStore = writable(initialHudState);

/**
 * Partial state updater helper for Clean Code callers.
 * @param {Partial<typeof initialHudState>} patch
 */
export function updateHudState(patch) {
  hudStore.update(s => ({ ...s, ...patch }));
}

/**
 * Resets HUD store to initial defaults.
 */
export function resetHudState() {
  hudStore.set({ ...initialHudState });
}
