/**
 * game/engine/strategies/aiPropertyDecisions.js
 * AI heuristic decisions for property purchases, hostile buyouts, estate upgrades, and rent debt liquidation.
 */

import { BOARD_TILES } from '../../data.js';
import { gameState, matchSettings } from '../../state.js';
import { fmtMoney } from '../../utils.js';
import { playSFX } from '../../audio.js';
import { getTileWorldPosition } from '../../../three/board/coords.js';
import { isTeammate, ownsFullColorGroup } from '../../rules.js';
import {
  refreshTileTextureAndBuildings,
  refreshTileAndGroup,
  showSpeechBubble,
  playBuyoutCinematicFocus
} from '../../../three/scene.js';
import { context } from '../../../three/core/context.js';
import { animateBuyoutHostileStamp } from '../../../ui/anim.js';
import {
  renderCornerHUDs,
  spawnFloatingCashOnHUD,
  logEvent,
  animateRentTransferOnHUD,
  setStatusPill,
  clearThinkingState
} from '../../../ui/hud.js';
import {
  calculatePropertySaleValue,
  upgradeCityLevel,
  checkAndTriggerMonopoly
} from '../../../ui/modals.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../../network/p2p.js';
import { scheduleSoldPropertiesAuction } from '../auction.js';

const lastBotBuyoutTurn = {};

export function resetBuyoutMemory() {
  for (const k in lastBotBuyoutTurn) delete lastBotBuyoutTurn[k];
}

function getGameDelay(ms) {
  const speed = matchSettings.gameSpeed || 1;
  return Math.max(30, Math.round(ms / speed));
}

/**
 * Evaluates whether an AI tycoon should strategically buy out an opponent's tile.
 * Restricts buyouts to monopoly completion or high-stakes defensive blocks, requiring a strong cash cushion.
 */
export function shouldAIBuyoutTile(playerIdx, tile, st, buyoutCost) {
  const player = gameState.players[playerIdx];
  if (!player || !player.isAI || player.bankrupt) return false;
  if (!tile || !st || st.owner === playerIdx || st.owner === null || isTeammate(st.owner, playerIdx)) return false;

  if ((st.level || 0) >= 4) return false;
  if (player.cash < buyoutCost + 600000) return false;

  const currentTurn = Math.max(gameState.turnNumber || 0, gameState.netWorthHistory?.length || 0);
  if (lastBotBuyoutTurn[playerIdx] && (currentTurn - lastBotBuyoutTurn[playerIdx] < 6)) {
    return false;
  }

  if (tile.group) {
    const grpTiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === tile.group);
    const otherTiles = grpTiles.filter(t => t.id !== tile.id);

    const otherOwnedByBot = otherTiles.filter(t => gameState.properties[t.id]?.owner === playerIdx).length;
    if (otherOwnedByBot === otherTiles.length && otherTiles.length > 0) {
      return true;
    }

    const prevOwner = st.owner;
    const otherOwnedByPrevOwner = otherTiles.filter(t => gameState.properties[t.id]?.owner === prevOwner).length;
    if (otherOwnedByPrevOwner === otherTiles.length && otherTiles.length > 0 && player.cash >= buyoutCost + 800000) {
      return true;
    }
  }

  return false;
}

function sortLiquidatableTiles(ownedTiles, playerIdx) {
  return [...ownedTiles].sort((a, b) => {
    const aMonopoly = a.group ? ownsFullColorGroup(playerIdx, a.group) : false;
    const bMonopoly = b.group ? ownsFullColorGroup(playerIdx, b.group) : false;
    if (aMonopoly !== bMonopoly) return aMonopoly ? 1 : -1;
    const vA = calculatePropertySaleValue(a, gameState.properties[a.id]);
    const vB = calculatePropertySaleValue(b, gameState.properties[b.id]);
    return vA - vB;
  });
}

export async function handleAIDebtorLiquidation(playerIdx, player, owner, rent, isDoubles, ownerIdx, onBankrupt) {
  const resolvedOwnerIdx = typeof ownerIdx === 'number' && ownerIdx >= 0
    ? ownerIdx
    : (owner ? gameState.players.indexOf(owner) : -1);

  setStatusPill(`💸 <strong>${player.name}</strong> is selling cities to pay rent to <strong>${owner.name}</strong>...`, { isThinking: true, playerIdx });
  logEvent(`💸 <strong>${player.name}</strong> is selling properties to pay <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong>.`);
  await new Promise(r => setTimeout(r, getGameDelay(700)));

  const soldTiles = [];
  while (player.cash < rent) {
    const currentOwned = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === playerIdx);
    if (currentOwned.length === 0) break;
    const sorted = sortLiquidatableTiles(currentOwned, playerIdx);
    const cheapest = sorted[0];
    const cSt = gameState.properties[cheapest.id];
    const sVal = calculatePropertySaleValue(cheapest, cSt);
    cSt.owner = null;
    cSt.level = 0;
    cSt.mortgaged = false;
    player.cash += sVal;
    soldTiles.push(cheapest);
    refreshTileAndGroup(cheapest.id);
    logEvent(`⚡ <strong>${player.name}</strong> sold <strong>${cheapest.name}</strong> for <strong>${fmtMoney(sVal)}</strong> to pay rent.`);

    if (networkState.isMultiplayer) {
      broadcastAction('ACTION_SELL_CITY_FOR_RENT', { playerIdx, tileId: cheapest.id, saleVal: sVal });
    }
  }

  renderCornerHUDs();
  clearThinkingState();

  if (player.cash >= rent) {
    await animateRentTransferOnHUD(playerIdx, resolvedOwnerIdx >= 0 ? resolvedOwnerIdx : 0, rent);
    player.cash -= rent;
    owner.cash += rent;
    logEvent(`💸 <strong>${player.name}</strong> settled <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong>.`);
    renderCornerHUDs();

    if (networkState.isMultiplayer) {
      broadcastAction('ACTION_SETTLE_RENT', {
        debtorIdx: playerIdx,
        creditorIdx: resolvedOwnerIdx >= 0 ? resolvedOwnerIdx : null,
        rentOwed: rent,
        soldTileIds: soldTiles.map(t => t.id),
        isDoubles: Boolean(isDoubles)
      });
      if (networkState.isHost) {
        broadcastFullGameState();
      }
    }

    if (soldTiles.length > 0) {
      scheduleSoldPropertiesAuction(soldTiles, playerIdx, Boolean(isDoubles), 700);
      return;
    }

    if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
  } else if (onBankrupt) {
    onBankrupt(playerIdx, player, owner, rent, null, isDoubles, resolvedOwnerIdx, soldTiles);
  }
}

export async function handleAICityDecision(playerIdx, tile, isDoubles) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  const player = gameState.players[playerIdx];
  if (!player) return;

  setStatusPill(`🤔 <strong>${player.name}</strong> is deciding whether to buy <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
  await new Promise(r => setTimeout(r, getGameDelay(650)));
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

  if (player.cash >= tile.price + 120000) {
    player.cash -= tile.price;
    gameState.properties[tile.id].owner = playerIdx;
    playSFX('build', 1.0, getTileWorldPosition(tile.id));
    spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(tile.price)}`, false);
    showSpeechBubble(`Bought ${tile.name}!`, 1800);
    logEvent(`🤖 <strong>${player.name}</strong> bought <strong>${tile.name}</strong> for <strong>${fmtMoney(tile.price)}</strong>.`);
    refreshTileAndGroup(tile.id);
    renderCornerHUDs();
    let monopolyEvent = null;
    if (tile.group) {
      try {
        monopolyEvent = checkAndTriggerMonopoly(playerIdx, tile.group);
      } catch (err) {
        console.error('[AI Buy City] checkAndTriggerMonopoly error:', err);
      }
    }
    if (networkState.isMultiplayer && networkState.isHost) {
      broadcastAction('ACTION_BUY_CITY', { playerIdx, tileId: tile.id, isDoubles: Boolean(isDoubles) });
      broadcastFullGameState();
    }
    if (monopolyEvent && (monopolyEvent.monopoly || monopolyEvent.threat)) {
      await new Promise(r => setTimeout(r, getGameDelay(3500)));
    }
  } else {
    showSpeechBubble(`Passed on ${tile.name}`, 1500);
    logEvent(`⏭️ <strong>${player.name}</strong> passed on buying <strong>${tile.name}</strong>.`);
    if (networkState.isMultiplayer && networkState.isHost) {
      broadcastAction('ACTION_PASS_BUY_CITY', { playerIdx, tileId: tile.id, isDoubles: Boolean(isDoubles) });
      broadcastFullGameState();
    }
  }

  clearThinkingState();
  if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
}

export async function handleAIBuyoutDecision(playerIdx, tile, st, buyoutCost, isDoubles) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  const player = gameState.players[playerIdx];
  if (!player) return;

  setStatusPill(`🤔 <strong>${player.name}</strong> is weighing hostile buyout of <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
  await new Promise(r => setTimeout(r, getGameDelay(700)));
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

  const previousOwnerIdx = st.owner;
  const prevOwner = gameState.players[previousOwnerIdx];

  if (player.cash >= buyoutCost + 600000) {
    const currentTurn = Math.max(gameState.turnNumber || 0, gameState.netWorthHistory?.length || 0);
    lastBotBuyoutTurn[playerIdx] = currentTurn;
    const housesCost = (st.level || 0) * (tile.houseCost || 0);
    const sellerPayout = Math.round((tile.price || 0) * 1.4) + housesCost;
    const bankFee = buyoutCost - sellerPayout;

    player.cash -= buyoutCost;
    if (prevOwner) prevOwner.cash += sellerPayout;
    st.owner = playerIdx;
    st.takeoverCount = (st.takeoverCount || 0) + 1;

    playSFX('takeover', 1.0, getTileWorldPosition(tile.id));
    animateBuyoutHostileStamp(tile.name, player.name, prevOwner ? prevOwner.name : 'Opponent');
    spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(buyoutCost)} Buyout`, false);
    if (prevOwner) spawnFloatingCashOnHUD(previousOwnerIdx, `+${fmtMoney(sellerPayout)} Sold`, true);
    showSpeechBubble(`Hostile Buyout on ${tile.name}! 💰`, 2000);
    if (st.takeoverCount >= 2) {
      logEvent(`🏛️ <strong>${player.name}</strong> executed the FINAL takeover on <strong>${tile.name}</strong>! It is now a <strong>Protected Landmark</strong>!`);
    } else {
      logEvent(`⚔️ <strong>${player.name}</strong> executed a hostile buyout on <strong>${tile.name}</strong> from <strong>${prevOwner.name}</strong> for <strong>${fmtMoney(buyoutCost)}</strong> (${fmtMoney(bankFee)} Bank Tax burned).`);
    }
    refreshTileAndGroup(tile.id);
    renderCornerHUDs();
    let buyoutMonopolyEvent = null;
    if (tile.group) {
      try {
        buyoutMonopolyEvent = checkAndTriggerMonopoly(playerIdx, tile.group);
      } catch (err) {
        console.error('[AI Buyout] checkAndTriggerMonopoly error:', err);
      }
    }
    if (networkState.isMultiplayer && networkState.isHost) {
      broadcastAction('ACTION_BUYOUT_CITY', {
        playerIdx,
        tileId: tile.id,
        buyoutCost,
        sellerPayout,
        bankFee,
        takeoverCount: st.takeoverCount,
        prevOwnerIdx: previousOwnerIdx,
        isDoubles: Boolean(isDoubles)
      });
      broadcastFullGameState();
    }
    if (context.camera) {
      await playBuyoutCinematicFocus(tile.id, 1500);
    }
    if (buyoutMonopolyEvent && (buyoutMonopolyEvent.monopoly || buyoutMonopolyEvent.threat)) {
      await new Promise(r => setTimeout(r, getGameDelay(3500)));
    }
  } else {
    showSpeechBubble(`Skipped buyout on ${tile.name}`, 1500);
    logEvent(`⏭️ <strong>${player.name}</strong> decided against buyout on <strong>${tile.name}</strong>.`);
    if (networkState.isMultiplayer && networkState.isHost) {
      broadcastAction('ACTION_PASS_BUYOUT', { playerIdx, tileId: tile.id, isDoubles: Boolean(isDoubles) });
      broadcastFullGameState();
    }
  }

  clearThinkingState();
  if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
}

export async function handleAIOwnedCityLanding(playerIdx, tile, isDoubles) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  const player = gameState.players[playerIdx];
  if (!player) return;
  const st = gameState.properties[tile.id];

  setStatusPill(`🤔 <strong>${player.name}</strong> is considering estate upgrades in <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
  await new Promise(r => setTimeout(r, getGameDelay(700)));
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

  let reachedMaxLevel = false;
  try {
    if (st && st.level < 4 && player.cash >= tile.houseCost + 200000) {
      const canDoTwo = st.level <= 2 && player.cash >= (tile.houseCost * 2) + 400000;
      const count = canDoTwo ? 2 : 1;
      upgradeCityLevel(tile.id, true, playerIdx, count);
      reachedMaxLevel = Boolean(st.level >= 4);
      const bubbleMsg = reachedMaxLevel
        ? `Erected Landmark in ${tile.name}! 🏛️`
        : (canDoTwo ? `Double Upgraded ${tile.name}! 🏗️🏗️` : `Upgraded ${tile.name}! 🏗️`);
      showSpeechBubble(bubbleMsg, reachedMaxLevel ? 2200 : 1800);
      logEvent(`🏗️ <strong>${player.name}</strong> upgraded estate in <strong>${tile.name}</strong> (+${count} Level${count > 1 ? 's' : ''}${reachedMaxLevel ? ' — Landmark Complete!' : ''}).`);
      if (networkState.isMultiplayer && networkState.isHost) {
        broadcastAction('ACTION_UPGRADE_CITY', { playerIdx, tileId: tile.id, count, levelsToAdd: count });
        broadcastFullGameState();
      }
    } else {
      showSpeechBubble(`Relaxing in ${tile.name}`, 1500);
      logEvent(`✨ <strong>${player.name}</strong> passed on upgrading <strong>${tile.name}</strong>.`);
      if (networkState.isMultiplayer && networkState.isHost) {
        broadcastAction('ACTION_END_UPGRADE', { playerIdx, tileId: tile.id, isDoubles: Boolean(isDoubles) });
        broadcastFullGameState();
      }
    }
  } catch (err) {
    console.error('[handleAIOwnedCityLanding] Error upgrading estate:', err);
  } finally {
    clearThinkingState();
  }

  if (reachedMaxLevel) {
    await new Promise(r => setTimeout(r, getGameDelay(1200)));
  }
  if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
}
