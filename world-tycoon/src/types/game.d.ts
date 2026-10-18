/**
 * types/game.d.ts
 * Strict TypeScript contracts for World Tycoon: Global Edition.
 * Covers full game state, match configurations, player schemas, and network protocols.
 */

export type BoardEdition = 'world' | 'rajasthan';
export type BoardStyle = 'wood' | 'cyberpunk' | 'elegant';
export type LightingTheme = 'day' | 'sunset' | 'night';
export type TurnPhase = 'ROLL' | 'MOVING' | 'MODAL' | 'WORLD_TOUR' | 'AUCTION' | 'TRADE' | 'END' | 'SETUP';

export interface CustomPlayer {
  name: string;
  isAI: boolean;
  charColor?: number;
  colorHex?: string;
  hatColor?: number;
  hatStyle?: number;
  pedestal?: string;
  isOnlinePeer?: boolean;
  peerId?: string | null;
}

export interface MatchSettings {
  startingCash: number;
  turnDuration: number;
  lightingTheme: LightingTheme;
  boardStyle: BoardStyle;
  boardEdition: BoardEdition;
  monopolySetsToWin: number;
  lineMonopolyEnabled: boolean;
  matchDurationMinutes: number;
  gameSpeed: number;
  customPlayers: CustomPlayer[];
}

export interface PlayerGameState {
  id?: number;
  name: string;
  isAI: boolean;
  cash: number;
  position: number;
  inIsland: boolean;
  islandTurns: number;
  bankrupt: boolean;
}

export interface PropertyState {
  owner: number | null;
  level: number;
  festivalBoost?: boolean;
  festival?: boolean;
  festivalMultiplier?: number;
}

export interface AuctionState {
  tileId: number;
  highestBid: number;
  highestBidder: number | null;
  activePlayers: number[];
  currentBidderIdx: number;
  timeLeft: number;
}

export interface TradeOffer {
  proposerIdx: number;
  targetIdx: number;
  offerCash: number;
  reqCash: number;
  offerTileIds: number[];
  reqTileIds: number[];
}

export interface GameState {
  gameStarted: boolean;
  players: PlayerGameState[];
  properties: Record<number, PropertyState>;
  currentPlayerIdx: number;
  phase: TurnPhase;
  doublesCount: number;
  festivalPot: number;
  turnTimeLeft: number;
  activeInspectorTile: number | null;
  auction: AuctionState | null;
  pendingBuyTile: number | null;
  pendingDoubles: boolean;
  upgradesThisVisit: number;
  netWorthHistory: Array<{ turn: number; time: string; values: number[] }>;
  matchSeconds?: number;
  achievedMonopolies?: Record<string, number>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   NETWORK PROTOCOL DISCRIMINATED UNIONS
───────────────────────────────────────────────────────────────────────────── */

export interface PacketGuestJoin {
  type: 'GUEST_JOIN';
  name: string;
  archetype?: number;
  charColor?: string;
}

export interface PacketJoinAccepted {
  type: 'JOIN_ACCEPTED';
  assignedSlot: number;
  roomCode: string;
  matchSettings: MatchSettings;
  setupPlayers: CustomPlayer[];
  lobbyPlayerCount: number;
}

export interface PacketJoinRejected {
  type: 'JOIN_REJECTED';
  reason: string;
}

export interface PacketClientUpdateProfile {
  type: 'CLIENT_UPDATE_PROFILE';
  playerIdx?: number;
  name?: string;
  colorHex?: string;
  charColor?: number;
  hatStyle?: number;
  hatColor?: number;
  pedestal?: string;
}

export interface PacketLobbyState {
  type: 'LOBBY_STATE';
  roomCode?: string;
  matchSettings: MatchSettings;
  setupPlayers: CustomPlayer[];
  lobbyPlayerCount: number;
}

export interface PacketFullStateSync {
  type: 'FULL_STATE_SYNC';
  gameState: {
    gameStarted: boolean;
    currentPlayerIdx: number;
    phase: TurnPhase;
    matchSeconds?: number;
    festivalPot: number;
    players: PlayerGameState[];
    properties: Record<number | string, PropertyState>;
  };
}

export interface PacketActionRoll {
  type: 'ACTION_ROLL';
  senderIdx: number;
  playerIdx: number;
  d1: number;
  d2: number;
  total: number;
  isDoubles: boolean;
  timestamp: number;
}

export interface PacketActionBuyCity {
  type: 'ACTION_BUY_CITY';
  senderIdx: number;
  playerIdx: number;
  tileId: number;
  timestamp: number;
}

export interface PacketActionUpgradeCity {
  type: 'ACTION_UPGRADE_CITY';
  senderIdx: number;
  playerIdx: number;
  tileId: number;
  timestamp: number;
}

export interface PacketActionBuyoutCity {
  type: 'ACTION_BUYOUT_CITY';
  senderIdx: number;
  playerIdx: number;
  tileId: number;
  prevOwnerIdx: number;
  buyoutCost: number;
  timestamp: number;
}

export interface PacketActionEndTurn {
  type: 'ACTION_END_TURN';
  senderIdx: number;
  playerIdx: number;
  nextPlayerIdx: number;
  timestamp: number;
}

export interface PacketActionReaction {
  type: 'ACTION_REACTION';
  senderIdx: number;
  playerIdx: number;
  emoji: string;
  timestamp: number;
}

export interface PacketPlayerDisconnected {
  type: 'PLAYER_DISCONNECTED';
  playerIdx: number;
  setupPlayers: CustomPlayer[];
  lobbyPlayerCount: number;
}

export interface PacketMatchDisconnectedToLobby {
  type: 'MATCH_DISCONNECTED_TO_LOBBY';
  reason: string;
}

export type NetworkPacket =
  | PacketGuestJoin
  | PacketJoinAccepted
  | PacketJoinRejected
  | PacketClientUpdateProfile
  | PacketLobbyState
  | PacketFullStateSync
  | PacketActionRoll
  | PacketActionBuyCity
  | PacketActionUpgradeCity
  | PacketActionBuyoutCity
  | PacketActionEndTurn
  | PacketActionReaction
  | PacketPlayerDisconnected
  | PacketMatchDisconnectedToLobby;
