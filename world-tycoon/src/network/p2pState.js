/**
 * network/p2pState.js
 * P2P network state, registered engine callbacks, and room ID formatting.
 */

export const networkState = {
  isMultiplayer: false,
  isHost: false,
  localPlayerIdx: 0,
  roomCode: '',
  peerId: '',
  peer: null,
  connections: new Map(), // For host: peerId -> conn
  hostConn: null,         // For guest: conn to host
  connectedPeersCount: 0,
  status: 'offline',      // 'offline' | 'connecting' | 'hosting' | 'connected' | 'error'
  statusText: '',
  isReconnecting: false
};

export let networkCallbacks = {
  onLobbyUpdate: () => {},
  onStartGame: () => {},
  onDiceRoll: () => {},
  onBuyCity: () => {},
  onBuyoutCity: () => {},
  'onPassBuyout': () => {},
  onRentDebt: () => {},
  onUpgradeCity: () => {},
  onDowngradeCity: () => {},
  onFestivalBoost: () => {},
  onAuctionAction: () => {},
  onTradeAction: () => {},
  onReaction: () => {},
  onWorldTour: () => {},
  onChanceSpin: () => {},
  onChancePrize: () => {},
  onMonopoly: () => {},
  onEndTurn: () => {},
  onSyncState: () => {},
  onPlayerConvertedToAI: () => {}
};

export function registerNetworkCallbacks(cbs) {
  networkCallbacks = { ...networkCallbacks, ...cbs };
}

export function isResponsibleForLandingMutation(playerIdx, player) {
  return !networkState.isMultiplayer ||
    playerIdx === networkState.localPlayerIdx ||
    (Boolean(player?.isAI) && networkState.isHost);
}

export function generateRoomCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let res = '';
  for (let i = 0; i < 4; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

const TURN_USERNAME = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURN_USERNAME) || '';
const TURN_CREDENTIAL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TURN_CREDENTIAL) || '';

const TURN_RELAYS = (TURN_USERNAME && TURN_CREDENTIAL)
  ? [
      'turn:standard.relay.metered.ca:80',
      'turn:standard.relay.metered.ca:80?transport=tcp',
      'turn:standard.relay.metered.ca:443',
      'turns:standard.relay.metered.ca:443?transport=tcp'
    ].map(urls => ({ urls, username: TURN_USERNAME, credential: TURN_CREDENTIAL }))
  : [];

export const ICE_SERVERS = [
  // Fast Anycast STUN servers for direct low-latency P2P
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  ...TURN_RELAYS
];

let hostHeartbeatTimer = null;

export function startHostHeartbeat() {
  stopHostHeartbeat();
  hostHeartbeatTimer = setInterval(() => {
    if (networkState.isHost && networkState.peer && !networkState.peer.destroyed) {
      if (networkState.peer.disconnected) {
        console.warn('[P2P Signaling] Host peer was disconnected from signaling server, reconnecting...');
        try {
          networkState.peer.reconnect();
        } catch (err) {
          console.warn('[P2P Signaling] Reconnect attempt failed:', err);
        }
      }
    }
  }, 12000);
}

export function stopHostHeartbeat() {
  if (hostHeartbeatTimer) {
    clearInterval(hostHeartbeatTimer);
    hostHeartbeatTimer = null;
  }
}

export function formatPeerRoomId(code) {
  return `worldtycoon-v1-${code.toUpperCase().trim()}`;
}
