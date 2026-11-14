/**
 * svelte/stores/lobbyStore.js
 * Reactive store for pre-game lobby setup, player roster cards, and customization state.
 */

import { writable } from 'svelte/store';

export const initialLobbyState = {
  playerCount: 4,
  selectedPlayerIdx: 0,
  currentView: 'title', // 'title' | 'local' | 'multiplayer-portal' | 'multiplayer-room'
  activeDisplayName: 'TYCOON',
  canEditCurrent: true,
  isRoomActive: false,
  isMultiplayer: false,
  isHost: false,
  isTeamMode: false,
  isTeamBalanceValid: true,
  teamBalanceError: null,
  roomCode: '',
  networkStatus: 'Ready',
  networkStatusKind: 'neutral',
  portalStatus: '',
  portalStatusKind: 'neutral',
  players: [
    { idx: 0, name: 'TYCOON', isAI: false, isOnlinePeer: false, colorHex: '#10b981', hatStyle: 0, isSelected: true, isSelf: true, isHost: true, canEditName: true, canEditSlot: true, isConnectedPeer: false },
    { idx: 1, name: 'WARREN', isAI: true, isOnlinePeer: false, colorHex: '#3b82f6', hatStyle: 1, isSelected: false, isSelf: false, isHost: false, canEditName: false, canEditSlot: true, isConnectedPeer: false },
    { idx: 2, name: 'CHUCK', isAI: true, isOnlinePeer: false, colorHex: '#f59e0b', hatStyle: 2, isSelected: false, isSelf: false, isHost: false, canEditName: false, canEditSlot: true, isConnectedPeer: false },
    { idx: 3, name: 'VANDER', isAI: true, isOnlinePeer: false, colorHex: '#ef4444', hatStyle: 3, isSelected: false, isSelf: false, isHost: false, canEditName: false, canEditSlot: true, isConnectedPeer: false }
  ]
};

export const lobbyStore = writable({ ...initialLobbyState });

/**
 * Updates a partial slice of lobbyStore
 * @param {Partial<typeof initialLobbyState>} patch
 */
export function updateLobbyStore(patch) {
  lobbyStore.update(s => ({ ...s, ...patch }));
}

/**
 * Reset lobbyStore to default state
 */
export function resetLobbyStore() {
  lobbyStore.set({ ...initialLobbyState });
}
