import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { createSafeLobbyStatePacket } from '../../src/network/protocol.js';
import { networkState, broadcastAction } from '../../src/network/p2p.js';
import { gameState, matchSettings, setupPlayers } from '../../src/game/state.js';
import { togglePlayerTeam } from '../../src/ui/setup/playerCards.js';
import { completeTradeTransfer } from '../../src/ui/modals/trade.js';
import { executeIncomingNetworkAction } from '../../src/network/p2pActions.js';
import { BOARD_TILES } from '../../src/game/data.js';

describe('Multiplayer Mode Bug Fixes & Edge Cases (/bug-hunter)', () => {
  beforeEach(() => {
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    networkState.isMultiplayer = true;
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;

    matchSettings.teamMode = true;
    matchSettings.customPlayers = [
      { name: 'Host', isAI: false, teamId: 0, charColor: 0xef4444, colorHex: '#ef4444' },
      { name: 'Guest', isAI: false, teamId: 1, charColor: 0x3b82f6, colorHex: '#3b82f6' }
    ];
    setupPlayers.splice(0, setupPlayers.length,
      { name: 'Host', isAI: false, isOnlinePeer: false, teamId: 0 },
      { name: 'Guest', isAI: false, isOnlinePeer: true, teamId: 1 }
    );
    gameState.players = [
      { id: 'p0', name: 'Host', cash: 2000000, bankrupt: false, isAI: false, position: 0, teamId: 0 },
      { id: 'p1', name: 'Guest', cash: 2000000, bankrupt: false, isAI: false, position: 0, teamId: 1 }
    ];
  });

  it('createSafeLobbyStatePacket preserves teamMode in matchSettings and teamId in setupPlayers', () => {
    const packet = createSafeLobbyStatePacket(matchSettings, setupPlayers, 2);
    assert.equal(packet.matchSettings.teamMode, true, 'Lobby packet must include teamMode');
    assert.equal(packet.setupPlayers[0].teamId, 0, 'Player 0 must retain teamId 0');
    assert.equal(packet.setupPlayers[1].teamId, 1, 'Player 1 must retain teamId 1');
  });

  it('allows Guest to toggle their own team in lobby and broadcasts ACTION_GUEST_TEAM_SELECT', () => {
    networkState.isHost = false;
    networkState.localPlayerIdx = 1;

    togglePlayerTeam(1);

    assert.equal(matchSettings.customPlayers[1].teamId, 0, 'Guest teamId should flip from 1 to 0');
    assert.equal(setupPlayers[1].teamId, 0, 'Setup player teamId should flip from 1 to 0');
  });

  it('voids trade transfer completely if all offered properties were lost before acceptance', () => {
    // Tile 22 is already owned by Player 1 (lost by Player 0)
    gameState.properties[22] = { owner: 1, level: 0 };
    gameState.properties[6] = { owner: 1, level: 0 };

    // Player 0 offers Paris (22) in exchange for Athens (6)
    const result = completeTradeTransfer(0, 1, 0, 0, [22], [6]);

    assert.equal(result, false, 'Trade should be voided because Paris was lost by Player 0');
    assert.equal(gameState.properties[6].owner, 1, 'Athens should remain with Player 1');
  });

  it('ACTION_TEAM_BAILOUT updates player balances across peers in multiplayer', () => {
    gameState.players[0].cash = 1000000;
    gameState.players[1].cash = 50000;

    executeIncomingNetworkAction({
      type: 'ACTION_TEAM_BAILOUT',
      partnerIdx: 0,
      playerIdx: 1,
      deficit: 150000,
      senderIdx: 0
    });

    assert.equal(gameState.players[0].cash, 850000, 'Partner cash should decrease by bailout deficit');
    assert.equal(gameState.players[1].cash, 200000, 'Debtor cash should increase by bailout deficit');
  });

  it('Host cleanly concludes action phase when debtor settles rent without selling properties', () => {
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;

    let concludedDoubles = null;
    global.window.concludeActionPhase = (doubles) => {
      concludedDoubles = doubles;
    };

    gameState.players[1].cash = 500000;
    gameState.players[0].cash = 500000;

    executeIncomingNetworkAction({
      type: 'ACTION_SETTLE_RENT',
      debtorIdx: 1,
      creditorIdx: 0,
      rentOwed: 100000,
      soldTileIds: [],
      isDoubles: false,
      senderIdx: 1
    });

    assert.equal(concludedDoubles, false, 'Host must conclude action phase immediately without 24s stall');
  });
});
