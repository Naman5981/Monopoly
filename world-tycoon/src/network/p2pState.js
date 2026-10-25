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
  statusText: ''
};

export let networkCallbacks = {
  onLobbyUpdate: () => {},
  onStartGame: () => {},
  onDiceRoll: () => {},
  onBuyCity: () => {},
  onUpgradeCity: () => {},
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

export function generateRoomCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let res = '';
  for (let i = 0; i < 4; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export function formatPeerRoomId(code) {
  return `worldtycoon-v1-${code.toUpperCase().trim()}`;
}
