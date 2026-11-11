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
  onPassBuyout: () => {},
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

export function generateRoomCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let res = '';
  for (let i = 0; i < 4; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export const ICE_SERVERS = [
  // Fast Anycast STUN servers for direct low-latency P2P
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.relay.metered.ca:80' },

  // Enterprise TURN Relays (Port 80 UDP/TCP, Port 443 UDP, and TLS Port 443 TURNS)
  // Bypasses Symmetric NAT, Carrier-Grade NAT (CGNAT), and restrictive mobile firewalls
  {
    urls: 'turn:standard.relay.metered.ca:80',
    username: 'fb1196664ecd226fccae55c8',
    credential: 'vxqp3kJ5a/BD5qZa'
  },
  {
    urls: 'turn:standard.relay.metered.ca:80?transport=tcp',
    username: 'fb1196664ecd226fccae55c8',
    credential: 'vxqp3kJ5a/BD5qZa'
  },
  {
    urls: 'turn:standard.relay.metered.ca:443',
    username: 'fb1196664ecd226fccae55c8',
    credential: 'vxqp3kJ5a/BD5qZa'
  },
  {
    urls: 'turns:standard.relay.metered.ca:443?transport=tcp',
    username: 'fb1196664ecd226fccae55c8',
    credential: 'vxqp3kJ5a/BD5qZa'
  }
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
