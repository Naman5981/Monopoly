/**
 * network/p2p.js
 * Serverless Peer-to-Peer Multiplayer Facade using WebRTC & PeerJS.
 *
 * Modularized into focused sub-modules:
 * - network/p2pState.js: Network state, registration callbacks, room ID formatting
 * - network/p2pHost.js: Host lifecycle, connection listener, lobby & game broadcasting
 * - network/p2pGuest.js: Guest connection, profile syncing, host message processing
 * - network/p2pActions.js: Real-time action broadcasting & dispatching
 * - network/p2pUI.js: UI state indicators, badges, clipboard copying, disconnect handling
 */

export * from './p2pState.js';
export * from './p2pHost.js';
export * from './p2pGuest.js';
export * from './p2pActions.js';
export * from './p2pUI.js';

import {
  copyRoomInviteLink,
  copyRoomCodeOnly,
  leaveMultiplayerRoom,
  returnToLobbyFromDisconnect
} from './p2pUI.js';

import { hostRoom } from './p2pHost.js';
import { joinRoom } from './p2pGuest.js';

if (typeof window !== 'undefined') {
  window.copyRoomInviteLink = copyRoomInviteLink;
  window.copyRoomCodeOnly = copyRoomCodeOnly;
  window.leaveMultiplayerRoom = leaveMultiplayerRoom;
  window.returnToLobbyFromDisconnect = returnToLobbyFromDisconnect;
  window.hostRoom = hostRoom;
  window.joinRoom = joinRoom;
}
