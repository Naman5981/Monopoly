/**
 * network/p2pActions.js
 * In-game multiplayer action dispatching: rolls, purchases, buyouts, auctions, trades, and rent settlements.
 */

import { gameState, setupPlayers, lobbyPlayerCount } from '../game/state.js';
import { logEvent, renderCornerHUDs } from '../ui/hud.js';
import { playSFX } from '../game/audio.js';
import { fmtMoney } from '../game/utils.js';
import { spawnAnimatedReaction } from '../three/effects.js';
import { BOARD_TILES } from '../game/data.js';
import { refreshTileTextureAndBuildings } from '../three/scene.js';
import { networkState, networkCallbacks } from './p2pState.js';
import { broadcastToAll, broadcastFullGameState } from './p2pHost.js';

export function broadcastAction(actionType, payload = {}) {
  const msg = {
    type: actionType,
    senderIdx: networkState.localPlayerIdx,
    timestamp: Date.now(),
    ...payload
  };

  if (!networkState.isMultiplayer) return;

  if (networkState.isHost) {
    broadcastToAll(msg);
  } else if (networkState.hostConn && networkState.hostConn.open) {
    networkState.hostConn.send(msg);
  }
}

export function executeIncomingNetworkAction(msg) {
  // If we were the sender, we already initiated this locally
  if (msg.senderIdx === networkState.localPlayerIdx) return;

  switch (msg.type) {
    case 'ACTION_ROLL':
      if (networkCallbacks.onDiceRoll) {
        networkCallbacks.onDiceRoll(msg.playerIdx, msg.d1, msg.d2, msg.total, msg.isDoubles);
      }
      break;

    case 'ACTION_BUY_CITY':
      if (networkCallbacks.onBuyCity) {
        networkCallbacks.onBuyCity(msg.playerIdx, msg.tileId);
      }
      break;

    case 'ACTION_BUYOUT_CITY':
      if (networkCallbacks.onBuyoutCity) {
        networkCallbacks.onBuyoutCity(msg.playerIdx, msg.tileId, msg.prevOwnerIdx, msg.buyoutCost);
      }
      break;

    case 'ACTION_UPGRADE_CITY':
      if (networkCallbacks.onUpgradeCity) {
        networkCallbacks.onUpgradeCity(msg.playerIdx, msg.tileId, msg.count || 1);
      }
      break;

    case 'ACTION_PAY_BAIL': {
      const p = gameState.players[msg.playerIdx];
      if (p) {
        p.inIsland = false;
        p.islandTurns = 0;
        p.cash -= 150000;
        gameState.festivalPot += 150000;
        renderCornerHUDs();
      }
      logEvent(`🏝️ <strong>${p ? p.name : 'Player'}</strong> paid 150K Island Bail.`);
      break;
    }

    case 'ACTION_SELL_CITY_FOR_RENT': {
      const p = gameState.players[msg.playerIdx];
      const t = BOARD_TILES[msg.tileId];
      const st = gameState.properties[msg.tileId];
      if (st) {
        st.owner = null;
        st.level = 0;
        refreshTileTextureAndBuildings(msg.tileId);
      }
      if (p) {
        p.cash += (msg.saleVal || 0);
        renderCornerHUDs();
      }
      logEvent(`🏷️ <strong>${p ? p.name : 'Player'}</strong> sold <strong>${t ? t.name : 'Property'}</strong> to pay rent.`);
      break;
    }

    case 'ACTION_SETTLE_RENT': {
      const debtor = gameState.players[msg.debtorIdx];
      const creditor = gameState.players[msg.creditorIdx];
      if (debtor && creditor) {
        debtor.cash -= msg.rentOwed;
        creditor.cash += msg.rentOwed;
        playSFX('cash');
        logEvent(`💸 <strong>${debtor.name}</strong> settled <strong>${fmtMoney(msg.rentOwed)}</strong> rent to <strong>${creditor.name}</strong>.`);
        renderCornerHUDs();
      }
      break;
    }

    case 'ACTION_BANKRUPTCY': {
      const bankruptP = gameState.players[msg.bankruptIdx];
      const creditorP = msg.creditorIdx !== undefined ? gameState.players[msg.creditorIdx] : null;
      if (bankruptP) {
        bankruptP.cash = 0;
        bankruptP.bankrupt = true;
        if (creditorP && msg.paidCash) {
          creditorP.cash += msg.paidCash;
        }
        BOARD_TILES.forEach(t => {
          const st = gameState.properties[t.id];
          if (st && st.owner === msg.bankruptIdx) {
            st.owner = null;
            st.level = 0;
            refreshTileTextureAndBuildings(t.id);
          }
        });
        logEvent(`💥 <strong>${bankruptP.name}</strong> declared bankruptcy!`);
        renderCornerHUDs();
      }
      break;
    }

    case 'ACTION_AUCTION_BID':
    case 'ACTION_AUCTION_PASS':
      if (networkCallbacks.onAuctionAction) {
        networkCallbacks.onAuctionAction(msg);
      }
      break;

    case 'ACTION_TRADE_OFFER':
    case 'ACTION_TRADE_RESPONSE':
      if (networkCallbacks.onTradeAction) {
        networkCallbacks.onTradeAction(msg);
      }
      break;

    case 'ACTION_WORLD_TOUR':
      if (networkCallbacks.onWorldTour) {
        networkCallbacks.onWorldTour(msg.playerIdx, msg.destTileId);
      }
      break;

    case 'ACTION_CHANCE_PRIZE':
      if (networkCallbacks.onChancePrize) {
        networkCallbacks.onChancePrize(msg.playerIdx, msg.prize, msg.isDoubles);
      }
      break;

    case 'ACTION_MONOPOLY':
      if (networkCallbacks.onMonopoly) {
        networkCallbacks.onMonopoly(msg.playerIdx, msg.groupKey);
      }
      break;

    case 'ACTION_REACTION':
      if (msg.reactionType) {
        spawnAnimatedReaction(msg.reactionType);
        playSFX('pop');
      }
      break;

    case 'ACTION_END_TURN':
      if (networkCallbacks.onEndTurn) {
        networkCallbacks.onEndTurn(msg.nextPlayerIdx);
      }
      break;

    case 'ACTION_REQUEST_PLAY_AGAIN': {
      const pName = msg.playerName || setupPlayers[msg.senderIdx]?.name || 'Tycoon Friend';
      logEvent(`🔔 <strong>${pName}</strong> wants to Play Again!`);
      const statusEl = document.getElementById('victory-multiplayer-status');
      if (statusEl) {
        statusEl.innerHTML = `🔔 <strong>${pName}</strong> wants to Play Again! Click <strong>PLAY AGAIN</strong> to start.`;
        statusEl.classList.remove('hidden');
      }
      const playBtn = document.getElementById('btn-victory-play-again');
      if (playBtn) {
        playBtn.classList.add('ring-4', 'ring-amber-300', 'animate-pulse');
        setTimeout(() => playBtn.classList.remove('ring-4', 'ring-amber-300', 'animate-pulse'), 5000);
      }
      playSFX('hop');
      break;
    }

    case 'ACTION_GUEST_LOBBY': {
      const pName = setupPlayers[msg.senderIdx]?.name || 'A player';
      logEvent(`🚪 <strong>${pName}</strong> returned to the lobby.`);
      if (gameState.gameStarted && networkState.isHost && msg.senderIdx !== undefined) {
        if (setupPlayers[msg.senderIdx]) {
          setupPlayers[msg.senderIdx].isAI = true;
          setupPlayers[msg.senderIdx].isOnlinePeer = false;
          setupPlayers[msg.senderIdx].peerId = null;
          setupPlayers[msg.senderIdx].name = `${setupPlayers[msg.senderIdx].name.replace(' (AI)', '')} (AI)`;
        }
        if (networkCallbacks.onPlayerConvertedToAI) {
          networkCallbacks.onPlayerConvertedToAI(msg.senderIdx);
        }
        broadcastToAll({
          type: 'PLAYER_DISCONNECTED',
          playerIdx: msg.senderIdx,
          setupPlayers,
          lobbyPlayerCount
        });
        broadcastFullGameState();
      }
      break;
    }

    default:
      break;
  }
}
