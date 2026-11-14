/**
 * game/engine/strategies/PropertyLandingStrategy.js
 * Strategy for landing on property tiles (Cities and Resorts).
 * Handles unowned acquisitions, rent transfers, debt liquidations, hostile buyouts, and upgrades.
 * Implements Single Responsibility (SRP) and Open/Closed Principle (OCP).
 */

import { ITileLandingStrategy } from './ITileLandingStrategy.js';
import { BOARD_TILES } from '../../data.js';
import { gameState, matchSettings } from '../../state.js';
import { fmtMoney } from '../../utils.js';
import { playSFX } from '../../audio.js';
import { getTileWorldPosition } from '../../../three/board/coords.js';
import { calculateTileRent, isTeammate, getTeamMembers } from '../../rules.js';
import {
  refreshTileTextureAndBuildings,
  showSpeechBubble,
  spawnShatterDebris,
  triggerBoardShockwave,
  playBuyoutCinematicFocus
} from '../../../three/scene.js';
import { context } from '../../../three/core/context.js';
import { animateBuyoutHostileStamp, animateBankruptcyQuake, animatePlayerEliminatedBanner } from '../../../ui/anim.js';
import {
  renderCornerHUDs,
  spawnFloatingCashOnHUD,
  logEvent,
  animateRentTransferOnHUD,
  setStatusPill,
  clearThinkingState
} from '../../../ui/hud.js';
import {
  openBuyCityModal,
  openBuyoutCityModal,
  calculateBuyoutCost,
  openSellCitiesModal,
  calculatePropertySaleValue,
  openUpgradeCityModal,
  upgradeCityLevel,
  checkAndTriggerMonopoly
} from '../../../ui/modals.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../../network/p2p.js';

let autoEndTurnTimer = null;

const lastBotBuyoutTurn = {};

export function resetBuyoutMemory() {
  for (const k in lastBotBuyoutTurn) delete lastBotBuyoutTurn[k];
}

/**
 * Evaluates whether an AI tycoon should strategically buy out an opponent's tile.
 * Restricts buyouts to monopoly completion or high-stakes defensive blocks, requiring a strong cash cushion.
 */
export function shouldAIBuyoutTile(playerIdx, tile, st, buyoutCost) {
  const player = gameState.players[playerIdx];
  if (!player || !player.isAI || player.bankrupt) return false;
  if (!tile || !st || st.owner === playerIdx || st.owner === null || isTeammate(st.owner, playerIdx)) return false;

  // Protect maxed skyscrapers
  if ((st.level || 0) >= 4) return false;

  // Enforce a strict cash cushion: Bot must keep at least $600,000 cash reserve after paying buyout
  if (player.cash < buyoutCost + 600000) return false;

  // Enforce 6-turn cooldown per bot
  const currentTurn = gameState.netWorthHistory?.length || 0;
  if (lastBotBuyoutTurn[playerIdx] && (currentTurn - lastBotBuyoutTurn[playerIdx] < 6)) {
    return false;
  }

  // Strategic Monopoly Check:
  if (tile.group) {
    const grpTiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === tile.group);
    const otherTiles = grpTiles.filter(t => t.id !== tile.id);

    // 1. Completing Own Monopoly: Does buying this tile complete a color group for this bot?
    const otherOwnedByBot = otherTiles.filter(t => gameState.properties[t.id]?.owner === playerIdx).length;
    if (otherOwnedByBot === otherTiles.length && otherTiles.length > 0) {
      return true;
    }

    // 2. Defensive Block: Does opponent own ALL the other tiles in this group? (Requires $800k cushion)
    const prevOwner = st.owner;
    const otherOwnedByPrevOwner = otherTiles.filter(t => gameState.properties[t.id]?.owner === prevOwner).length;
    if (otherOwnedByPrevOwner === otherTiles.length && otherTiles.length > 0 && player.cash >= buyoutCost + 800000) {
      return true;
    }
  }

  return false;
}

function getGameDelay(ms) {
  const speed = matchSettings.gameSpeed || 1;
  return Math.max(30, Math.round(ms / speed));
}

export class PropertyLandingStrategy extends ITileLandingStrategy {
  async execute(context) {
    const { playerIdx, player, tile, isDoubles } = context;
    const st = gameState.properties[tile.id];

    if (!st || st.owner === null) {
      await this.handleUnownedProperty(playerIdx, player, tile, isDoubles);
    } else if (st.owner !== playerIdx) {
      if (isTeammate(st.owner, playerIdx)) {
        await this.handleTeammateProperty(playerIdx, player, tile, st, isDoubles);
      } else {
        await this.handleOpponentProperty(playerIdx, player, tile, st, isDoubles);
      }
    } else {
      await this.handleSelfOwnedProperty(playerIdx, player, tile, st, isDoubles);
    }
  }

  async handleUnownedProperty(playerIdx, player, tile, isDoubles) {
    if (player.isAI) {
      if (networkState.isMultiplayer && !networkState.isHost) {
        showSpeechBubble(`${player.name} is deciding on ${tile.name}...`, 2500);
        return;
      }
      await this.handleAICityDecision(playerIdx, tile, isDoubles);
      return;
    }

    if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
      showSpeechBubble(`${player.name} is deciding on ${tile.name}...`, 3000);
      gameState.phase = 'MODAL';
      return;
    }

    openBuyCityModal(tile, isDoubles);
  }

  async handleTeammateProperty(playerIdx, player, tile, st, isDoubles) {
    const owner = gameState.players[st.owner];
    const partnerName = owner ? owner.name : 'Partner';

    logEvent(`🤝 <strong>${player.name}</strong> visited ally <strong>${partnerName}</strong>'s property <strong>${tile.name}</strong> (Alliance visit: <strong>$0 Rent</strong>).`);
    showSpeechBubble(`Alliance visit! No rent to ${partnerName} 🤝`, 2200);

    if (tile.type === 'city') {
      if (st.level >= 4) {
        showSpeechBubble(`Ally's Skyscraper in ${tile.name}! 👑🏆`, 2200);
        if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
      } else if (player.isAI) {
        if (networkState.isMultiplayer && !networkState.isHost) {
          showSpeechBubble(`${player.name} is visiting ${partnerName}'s city...`, 2500);
          return;
        }
        if (player.cash >= tile.houseCost + 300000) {
          player.cash -= tile.houseCost;
          st.level++;
          playSFX('build', 1.0, getTileWorldPosition(tile.id));
          spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(tile.houseCost)} (Ally Build)`, false);
          showSpeechBubble(`Upgraded ally ${partnerName}'s city! 🏗️`, 2200);
          logEvent(`🏗️ <strong>${player.name}</strong> invested and built a house in teammate <strong>${partnerName}</strong>'s city <strong>${tile.name}</strong> (Now Level ${st.level})!`);
          refreshTileTextureAndBuildings(tile.id);
          renderCornerHUDs();
        }
        if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
      } else {
        if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
          showSpeechBubble(`${player.name} is visiting ${partnerName}'s city...`, 3000);
          gameState.phase = 'MODAL';
          return;
        }
        openUpgradeCityModal(tile, isDoubles, true);
      }
    } else {
      showSpeechBubble(`Relaxing at ally's resort in ${tile.name}! 🌴`, 2200);
      if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
    }
  }

  async handleOpponentProperty(playerIdx, player, tile, st, isDoubles) {
    const rent = calculateTileRent(tile.id);
    const owner = gameState.players[st.owner];

    // Team Bailout: If player is insolvent, check if teammate can bail them out
    if (player.cash < rent && matchSettings.teamMode && player.teamId !== undefined) {
      const deficit = rent - player.cash;
      const teammates = getTeamMembers(player.teamId).filter(idx => idx !== playerIdx && !gameState.players[idx]?.bankrupt);
      if (teammates.length > 0) {
        const partnerIdx = teammates[0];
        const partner = gameState.players[partnerIdx];
        if (partner && partner.cash >= deficit) {
          if (partner.isAI && partner.cash >= deficit + 200000) {
            partner.cash -= deficit;
            player.cash += deficit;
            playSFX('cash');
            spawnFloatingCashOnHUD(partnerIdx, `-${fmtMoney(deficit)} Bailout`, false);
            spawnFloatingCashOnHUD(playerIdx, `+${fmtMoney(deficit)} Bailed out!`, true);
            showSpeechBubble(`${partner.name} bailed out ${player.name}! 🤝`, 2400);
            logEvent(`🤝 <strong>TEAM BAILOUT!</strong> <strong>${partner.name}</strong> transferred <strong>${fmtMoney(deficit)}</strong> to rescue teammate <strong>${player.name}</strong> from rent bankruptcy!`);
            renderCornerHUDs();
          }
        }
      }
    }

    // Insolvency check: Does player need to liquidate properties to pay rent?
    if (player.cash < rent) {
      const owned = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === playerIdx);

      if (owned.length > 0) {
        if (player.isAI) {
          if (networkState.isMultiplayer && !networkState.isHost) {
            showSpeechBubble(`${player.name} is selling cities to pay rent...`, 2500);
            return;
          }
          await this.handleAIDebtorLiquidation(playerIdx, player, owner, rent, isDoubles);
          return;
        } else {
          if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
            showSpeechBubble(`${player.name} is selling cities to pay rent...`, 3000);
            setStatusPill(`💸 Waiting for <strong>${player.name}</strong> to sell cities to pay <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong>...`, { isThinking: true, playerIdx });
            gameState.phase = 'MODAL';
            gameState.pendingRentDebt = {
              tile,
              rentOwed: rent,
              creditorIdx: st.owner,
              debtorIdx: playerIdx,
              isDoubles: Boolean(isDoubles)
            };
            logEvent(`💸 <strong>${player.name}</strong> is selling cities to pay rent to <strong>${owner.name}</strong>.`);
            broadcastAction('ACTION_RENT_DEBT', {
              debtorIdx: playerIdx,
              creditorIdx: st.owner,
              rentOwed: rent,
              tileId: tile.id,
              isDoubles: Boolean(isDoubles)
            });

            // Host safety timeout if remote debtor peer disconnects or freezes
            if (networkState.isHost) {
              setTimeout(() => {
                if (gameState.phase === 'MODAL' && gameState.pendingRentDebt && gameState.pendingRentDebt.debtorIdx === playerIdx) {
                  if (typeof window.autoSellCheapestForRent === 'function') {
                    window.autoSellCheapestForRent();
                  } else if (window.concludeActionPhase) {
                    window.concludeActionPhase(Boolean(isDoubles));
                  }
                }
              }, 28000);
            }
            return;
          }
          logEvent(`💸 <strong>${player.name}</strong> owes <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong> and must liquidate properties.`);
          if (networkState.isMultiplayer) {
            broadcastAction('ACTION_RENT_DEBT', {
              debtorIdx: playerIdx,
              creditorIdx: st.owner,
              rentOwed: rent,
              tileId: tile.id,
              isDoubles: Boolean(isDoubles)
            });
          }
          openSellCitiesModal(tile, rent, st.owner, isDoubles, playerIdx);
          return;
        }
      } else {
        // Bankruptcy: Debtor owns 0 properties and cash < rent
        this.executeBankruptcy(playerIdx, player, owner, rent, tile, isDoubles);
        return;
      }
    }

    // Solvency confirmed: Transfer rent
    showSpeechBubble(`Ouch! Paying ${fmtMoney(rent)} rent to ${owner.name}!`, 3000);
    logEvent(`💸 <strong>${player.name}</strong> landed on <strong>${tile.name}</strong> and transferred <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong>.`);
    await animateRentTransferOnHUD(playerIdx, st.owner, rent);

    player.cash -= rent;
    owner.cash += rent;
    renderCornerHUDs();

    // Hostile Buyout check
    const buyoutCost = calculateBuyoutCost(tile, st);
    if (buyoutCost > 0) {
      if (player.isAI) {
        if (shouldAIBuyoutTile(playerIdx, tile, st, buyoutCost)) {
          if (networkState.isMultiplayer && !networkState.isHost) {
            showSpeechBubble(`${player.name} is considering a buyout of ${tile.name}...`, 2500);
            return;
          }
          await this.handleAIBuyoutDecision(playerIdx, tile, st, buyoutCost, isDoubles);
          return;
        }
      } else if (player.cash >= buyoutCost + 100000) {
        if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
          showSpeechBubble(`${player.name} is considering a buyout of ${tile.name}...`, 3000);
          setStatusPill(`⚔️ Waiting for <strong>${player.name}</strong> to decide on hostile buyout of <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
          gameState.phase = 'MODAL';
          // Host safety fallback if remote peer disconnects or fails to respond
          if (networkState.isHost) {
            setTimeout(() => {
              if (gameState.phase === 'MODAL' && gameState.currentPlayerIdx === playerIdx) {
                if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
              }
            }, 14000);
          }
          return;
        }
        openBuyoutCityModal(tile, isDoubles);
        return;
      }
    }

    if (window.concludeActionPhase) {
      window.concludeActionPhase(isDoubles);
    }
  }

  async handleSelfOwnedProperty(playerIdx, player, tile, st, isDoubles) {
    if (tile.type === 'city') {
      if (st.level >= 4) {
        const rent = calculateTileRent(tile.id);
        showSpeechBubble(`Inspecting your maxed Skyscraper in ${tile.name}! 👑🏆`, 2200);
        logEvent(`👑 <strong>${player.name}</strong> visited their maxed <strong>Skyscraper</strong> in <strong>${tile.name}</strong> (Generating <strong>${fmtMoney(rent)}</strong> rent).`);
        if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
      } else if (player.isAI) {
        if (networkState.isMultiplayer && !networkState.isHost) {
          showSpeechBubble(`${player.name} is checking their estate in ${tile.name}...`, 2500);
          return;
        }
        await this.handleAIOwnedCityLanding(playerIdx, tile, isDoubles);
      } else {
        if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
          showSpeechBubble(`${player.name} is checking their estate in ${tile.name}...`, 3000);
          gameState.phase = 'MODAL';
          return;
        }
        openUpgradeCityModal(tile, isDoubles);
      }
    } else {
      showSpeechBubble(`Relaxing at your luxury resort in ${tile.name}! 🌴`, 2200);
      logEvent(`🌴 <strong>${player.name}</strong> visited their own resort in <strong>${tile.name}</strong>.`);
      if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
    }
  }

  async handleAIDebtorLiquidation(playerIdx, player, owner, rent, isDoubles) {
    setStatusPill(`💸 <strong>${player.name}</strong> is selling cities to pay rent to <strong>${owner.name}</strong>...`, { isThinking: true, playerIdx });
    logEvent(`💸 <strong>${player.name}</strong> is selling properties to pay <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong>.`);
    await new Promise(r => setTimeout(r, getGameDelay(700)));

    while (player.cash < rent) {
      const currentOwned = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === playerIdx);
      if (currentOwned.length === 0) break;
      currentOwned.sort((a, b) => {
        const vA = calculatePropertySaleValue(a, gameState.properties[a.id]);
        const vB = calculatePropertySaleValue(b, gameState.properties[b.id]);
        return vA - vB;
      });
      const cheapest = currentOwned[0];
      const cSt = gameState.properties[cheapest.id];
      const sVal = calculatePropertySaleValue(cheapest, cSt);
      cSt.owner = null;
      cSt.level = 0;
      player.cash += sVal;
      refreshTileTextureAndBuildings(cheapest.id);
      logEvent(`⚡ <strong>${player.name}</strong> sold <strong>${cheapest.name}</strong> for <strong>${fmtMoney(sVal)}</strong> to pay rent.`);
    }

    renderCornerHUDs();
    clearThinkingState();

    if (player.cash >= rent) {
      await animateRentTransferOnHUD(playerIdx, owner.id !== undefined ? owner.id : gameState.properties[cheapest?.id]?.owner, rent);
      player.cash -= rent;
      owner.cash += rent;
      logEvent(`💸 <strong>${player.name}</strong> settled <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong>.`);
      renderCornerHUDs();
      if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
    } else {
      this.executeBankruptcy(playerIdx, player, owner, rent, null, isDoubles);
    }
  }

  executeBankruptcy(playerIdx, player, owner, rent, tile, isDoubles) {
    const paid = Math.max(0, player.cash);
    player.cash = 0;
    if (owner) {
      owner.cash += paid;
    }
    player.bankrupt = true;

    playSFX('bankrupt', 1.0, tile ? getTileWorldPosition(tile.id) : null);
    showSpeechBubble(`Bankrupt! 💥`, 2500);
    if (owner) {
      logEvent(`💥 <strong>${player.name}</strong> has no cities to sell, transferred all remaining <strong>${fmtMoney(paid)}</strong> to <strong>${owner.name}</strong> for <strong>${fmtMoney(rent)}</strong> rent. <strong>BANKRUPT!</strong>`);
    } else {
      logEvent(`💥 <strong>${player.name}</strong> has no cities to sell to pay <strong>${fmtMoney(rent)}</strong> debt. <strong>BANKRUPT!</strong>`);
    }

    renderCornerHUDs();
    animatePlayerEliminatedBanner(player, owner);
    animateBankruptcyQuake(playerIdx);
    spawnShatterDebris(0, 0, 0xef4444, 36);
    triggerBoardShockwave(0, 0, 26, 32);

    if (networkState.isMultiplayer) {
      const creditorIdx = owner
        ? (owner.id !== undefined ? owner.id : (gameState.players.indexOf(owner) >= 0 ? gameState.players.indexOf(owner) : null))
        : null;
      broadcastAction('ACTION_BANKRUPTCY', {
        bankruptIdx: playerIdx,
        creditorIdx,
        paidCash: paid
      });
      if (networkState.isHost) {
        broadcastFullGameState();
      }
    }

    if (window.concludeActionPhase) {
      window.concludeActionPhase(isDoubles);
    }
  }

  async handleAICityDecision(playerIdx, tile, isDoubles) {
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
      refreshTileTextureAndBuildings(tile.id);
      renderCornerHUDs();
      if (tile.group) {
        checkAndTriggerMonopoly(playerIdx, tile.group);
      }
      if (networkState.isMultiplayer && networkState.isHost) {
        broadcastAction('ACTION_BUY_CITY', { playerIdx, tileId: tile.id, isDoubles: Boolean(isDoubles) });
        broadcastFullGameState();
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

  async handleAIBuyoutDecision(playerIdx, tile, st, buyoutCost, isDoubles) {
    if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
    const player = gameState.players[playerIdx];
    if (!player) return;

    setStatusPill(`🤔 <strong>${player.name}</strong> is weighing hostile buyout of <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
    await new Promise(r => setTimeout(r, getGameDelay(700)));
    if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

    const previousOwnerIdx = st.owner;
    const prevOwner = gameState.players[previousOwnerIdx];

    if (player.cash >= buyoutCost + 600000) {
      const currentTurn = gameState.netWorthHistory?.length || 0;
      lastBotBuyoutTurn[playerIdx] = currentTurn;
      player.cash -= buyoutCost;
      prevOwner.cash += buyoutCost;
      st.owner = playerIdx;
      playSFX('takeover', 1.0, getTileWorldPosition(tile.id));
      animateBuyoutHostileStamp(tile.name, player.name, prevOwner ? prevOwner.name : 'Opponent');
      spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(buyoutCost)} Buyout`, false);
      spawnFloatingCashOnHUD(previousOwnerIdx, `+${fmtMoney(buyoutCost)} Sold`, true);
      showSpeechBubble(`Hostile Buyout on ${tile.name}! 💰`, 2000);
      logEvent(`⚔️ <strong>${player.name}</strong> executed a hostile buyout on <strong>${tile.name}</strong> from <strong>${prevOwner.name}</strong> for <strong>${fmtMoney(buyoutCost)}</strong>.`);
      refreshTileTextureAndBuildings(tile.id);
      renderCornerHUDs();
      if (tile.group) {
        checkAndTriggerMonopoly(playerIdx, tile.group);
      }
      if (networkState.isMultiplayer && networkState.isHost) {
        broadcastAction('ACTION_BUYOUT_CITY', { playerIdx, tileId: tile.id, buyoutCost, prevOwnerIdx: previousOwnerIdx, isDoubles: Boolean(isDoubles) });
        broadcastFullGameState();
      }
      if (context.camera) {
        await playBuyoutCinematicFocus(tile.id, 1500);
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

  async handleAIOwnedCityLanding(playerIdx, tile, isDoubles) {
    if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
    const player = gameState.players[playerIdx];
    if (!player) return;
    const st = gameState.properties[tile.id];

    setStatusPill(`🤔 <strong>${player.name}</strong> is considering estate upgrades in <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
    await new Promise(r => setTimeout(r, getGameDelay(700)));
    if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

    if (st && st.level < 4 && player.cash >= tile.houseCost + 200000) {
      upgradeCityLevel(playerIdx, tile.id, 1);
      showSpeechBubble(`Upgraded ${tile.name}! 🏗️`, 1800);
      logEvent(`🏗️ <strong>${player.name}</strong> upgraded estate in <strong>${tile.name}</strong>.`);
      if (networkState.isMultiplayer && networkState.isHost) {
        broadcastAction('ACTION_UPGRADE_CITY', { playerIdx, tileId: tile.id, count: 1, levelsToAdd: 1 });
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

    clearThinkingState();
    if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
  }
}
