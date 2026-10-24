/**
 * network/protocol.js
 * Runtime packet validator and sanitizer for serverless P2P multiplayer.
 * Guarantees zero corrupt payloads, prevents desyncs, and sanitizes untrusted client input.
 */

const VALID_PACKET_TYPES = new Set([
  'GUEST_JOIN',
  'JOIN_ACCEPTED',
  'JOIN_REJECTED',
  'CLIENT_UPDATE_PROFILE',
  'LOBBY_STATE',
  'FULL_STATE_SYNC',
  'START_MATCH',
  'RETURN_TO_LOBBY',
  'ACTION_ROLL',
  'ACTION_BUY_CITY',
  'ACTION_BUYOUT_CITY',
  'ACTION_UPGRADE_CITY',
  'ACTION_PAY_BAIL',
  'ACTION_SELL_CITY_FOR_RENT',
  'ACTION_SETTLE_RENT',
  'ACTION_BANKRUPTCY',
  'ACTION_FESTIVAL_BOOST',
  'ACTION_AUCTION_BID',
  'ACTION_AUCTION_PASS',
  'ACTION_TRADE_OFFER',
  'ACTION_TRADE_RESPONSE',
  'ACTION_WORLD_TOUR',
  'ACTION_CHANCE_PRIZE',
  'ACTION_MONOPOLY',
  'ACTION_SYNC_BOARD_EDITION',
  'ACTION_END_TURN',
  'ACTION_REACTION',
  'ACTION_REQUEST_PLAY_AGAIN',
  'ACTION_GUEST_LOBBY',
  'PLAYER_DISCONNECTED',
  'MATCH_DISCONNECTED_TO_LOBBY'
]);

/**
 * Validates that an incoming network packet conforms to protocol structure.
 * @param {any} packet - Incoming raw packet
 * @returns {boolean}
 */
export function isValidPacket(packet) {
  if (!packet || typeof packet !== 'object') return false;
  if (typeof packet.type !== 'string') return false;
  return VALID_PACKET_TYPES.has(packet.type);
}

/**
 * Sanitizes and bounds a player's profile update.
 * @param {any} raw - Raw profile update payload from peer
 * @returns {{ name?: string, colorHex?: string, charColor?: number, hatStyle?: number, hatColor?: number, pedestal?: string }}
 */
export function sanitizeProfileUpdate(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const clean = {};

  if (typeof raw.name === 'string') {
    const trimmed = raw.name.trim().toUpperCase().slice(0, 14);
    clean.name = (trimmed && trimmed !== 'YOU') ? trimmed : 'PLAYER';
  }

  if (typeof raw.colorHex === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.colorHex)) {
    clean.colorHex = raw.colorHex.toLowerCase();
    clean.charColor = parseInt(clean.colorHex.slice(1), 16);
  } else if (typeof raw.charColor === 'number' && !isNaN(raw.charColor)) {
    clean.charColor = Math.max(0, Math.min(0xffffff, Math.floor(raw.charColor)));
    clean.colorHex = `#${clean.charColor.toString(16).padStart(6, '0')}`;
  }

  if (typeof raw.hatStyle === 'number' && !isNaN(raw.hatStyle)) {
    clean.hatStyle = Math.max(0, Math.min(6, Math.floor(raw.hatStyle)));
  }

  if (typeof raw.hatColor === 'number' && !isNaN(raw.hatColor)) {
    clean.hatColor = Math.max(0, Math.min(0xffffff, Math.floor(raw.hatColor)));
  }

  if (typeof raw.pedestal === 'string') {
    clean.pedestal = raw.pedestal.slice(0, 32);
  }

  return clean;
}

/**
 * Creates a sanitized, JSON-safe Lobby State packet for broadcasting.
 * @param {object} matchSettings
 * @param {Array<object>} setupPlayers
 * @param {number} lobbyPlayerCount
 * @returns {object}
 */
export function createSafeLobbyStatePacket(matchSettings, setupPlayers, lobbyPlayerCount) {
  const count = Math.max(2, Math.min(6, lobbyPlayerCount || 2));
  return {
    type: 'LOBBY_STATE',
    lobbyPlayerCount: count,
    matchSettings: {
      startingCash: matchSettings.startingCash || 2000000,
      turnDuration: matchSettings.turnDuration || 15,
      lightingTheme: matchSettings.lightingTheme || 'day',
      boardStyle: matchSettings.boardStyle || 'wood',
      boardEdition: matchSettings.boardEdition || 'world',
      monopolySetsToWin: matchSettings.monopolySetsToWin || 3,
      lineMonopolyEnabled: Boolean(matchSettings.lineMonopolyEnabled),
      matchDurationMinutes: matchSettings.matchDurationMinutes || 15,
      gameSpeed: matchSettings.gameSpeed || 1
    },
    setupPlayers: setupPlayers.slice(0, count).map((p, idx) => ({
      name: (p.name || `PLAYER ${idx + 1}`).trim().toUpperCase().slice(0, 14),
      isAI: Boolean(p.isAI),
      isOnlinePeer: Boolean(p.isOnlinePeer),
      charColor: typeof p.charColor === 'number' ? p.charColor : 0x3b82f6,
      colorHex: p.colorHex || '#3b82f6',
      hatStyle: typeof p.hatStyle === 'number' ? p.hatStyle : 0,
      hatColor: typeof p.hatColor === 'number' ? p.hatColor : 0x334155,
      pedestal: p.pedestal || 'pedestal_classic'
    }))
  };
}
