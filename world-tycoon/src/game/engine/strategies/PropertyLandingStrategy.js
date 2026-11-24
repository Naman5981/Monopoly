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
  clearThinkingState,
  updateRollButtonsUI
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
import { startSoldPropertiesAuctionSequence, clearAuctionTimers } from '../auction.js';
import { cancelAllGameTimers } from '../turnCycle.js';

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
          if (networkState.isMultiplayer && networkState.isHost) {
            broadcastAction('ACTION_UPGRADE_CITY', { playerIdx, tileId: tile.id, count: 1, levelsToAdd: 1 });
            broadcastFullGameState();
          }
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
          const shouldBailout = partner.isAI ? (partner.cash >= deficit + 200000) : (partner.cash >= deficit);
          if (shouldBailout) {
            partner.cash -= deficit;
            player.cash += deficit;
            playSFX('cash');
            spawnFloatingCashOnHUD(partnerIdx, `-${fmtMoney(deficit)} Bailout`, false);
            spawnFloatingCashOnHUD(playerIdx, `+${fmtMoney(deficit)} Bailed out!`, true);
            showSpeechBubble(`${partner.name} bailed out ${player.name}! 🤝`, 2400);
            logEvent(`🤝 <strong>TEAM BAILOUT!</strong> <strong>${partner.name}</strong> transferred <strong>${fmtMoney(deficit)}</strong> to rescue teammate <strong>${player.name}</strong> from rent bankruptcy!`);
            renderCornerHUDs();
            if (networkState.isMultiplayer) {
              broadcastAction('ACTION_TEAM_BAILOUT', { partnerIdx, playerIdx, deficit });
              if (networkState.isHost) {
                broadcastFullGameState();
              }
            }
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
          await this.handleAIDebtorLiquidation(playerIdx, player, owner, rent, isDoubles, st.owner);
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
        this.executeBankruptcy(playerIdx, player, owner, rent, tile, isDoubles, st.owner);
        return;
      }
    }

    // Solvency confirmed: Transfer rent
    showSpeechBubble(`Ouch! Paying ${fmtMoney(rent)} rent to ${owner.name}!`, 3000);
    logEvent(`💸 <strong>${player.name}</strong> landed on <strong>${tile.name}</strong> and transferred <strong>${fmtMoney(rent)}</strong> rent to <strong>${owner.name}</strong>.`);
    gameState.isRentTransferring = true;
    gameState.pendingRentCreditor = st.owner;
    try {
      await animateRentTransferOnHUD(playerIdx, st.owner, rent, tile);
    } finally {
      gameState.isRentTransferring = false;
      gameState.pendingRentCreditor = null;
    }

    player.cash -= rent;
    owner.cash += rent;
    renderCornerHUDs();

    if (networkState.isMultiplayer) {
      if (playerIdx === networkState.localPlayerIdx || (player.isAI && networkState.isHost)) {
        broadcastAction('ACTION_PAY_RENT', {
          playerIdx,
          ownerIdx: st.owner,
          rent,
          tileId: tile.id
        });
      }
    }

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
      } else if (player.cash >= buyoutCost) {
        if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
          showSpeechBubble(`${player.name} is considering a buyout of ${tile.name}...`, 3000);
          setStatusPill(`⚔️ Waiting for <strong>${player.name}</strong> to decide on hostile buyout of <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
          gameState.phase = 'MODAL';
          // Host safety fallback if remote peer disconnects or fails to respond
          if (networkState.isHost) {
            if (gameState.buyoutWatchdogTimer) {
              clearTimeout(gameState.buyoutWatchdogTimer);
              gameState.buyoutWatchdogTimer = null;
            }
            gameState.buyoutWatchdogTimer = setTimeout(() => {
              gameState.buyoutWatchdogTimer = null;
              if (gameState.phase === 'MODAL' && gameState.currentPlayerIdx === playerIdx) {
                if (typeof window !== 'undefined' && window.passBuyoutCity) {
                  window.passBuyoutCity();
                } else if (window.concludeActionPhase) {
                  window.concludeActionPhase(isDoubles);
                }
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

  async handleAIDebtorLiquidation(playerIdx, player, owner, rent, isDoubles, ownerIdx = null) {
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
      cSt.mortgaged = false;
      player.cash += sVal;
      soldTiles.push(cheapest);
      refreshTileTextureAndBuildings(cheapest.id);
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
        cancelAllGameTimers();
        clearAuctionTimers();
        gameState.phase = 'AUCTION';
        updateRollButtonsUI(false);
        if (!networkState.isMultiplayer || networkState.isHost) {
          const delay = globalThis.__WT_TEST__ ? 0 : 700;
          if (delay > 0) {
            setTimeout(() => {
              startSoldPropertiesAuctionSequence(soldTiles, playerIdx, Boolean(isDoubles));
            }, delay);
          } else {
            startSoldPropertiesAuctionSequence(soldTiles, playerIdx, Boolean(isDoubles));
          }
        }
        return;
      }

      if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
    } else {
      this.executeBankruptcy(playerIdx, player, owner, rent, null, isDoubles, resolvedOwnerIdx, soldTiles);
    }
  }

  executeBankruptcy(playerIdx, player, owner, rent, tile, isDoubles, ownerIdx = null, soldTiles = []) {
    const resolvedOwnerIdx = typeof ownerIdx === 'number' && ownerIdx >= 0
      ? ownerIdx
      : (owner ? gameState.players.indexOf(owner) : null);

    const paid = Math.max(0, player.cash);
    player.cash = 0;
    if (owner) {
      owner.cash += paid;
    }
    player.bankrupt = true;

    // Transfer remaining unsold properties to creditor if solvent, otherwise revert to bank
    BOARD_TILES.forEach(t => {
      const st = gameState.properties[t.id];
      if (st && st.owner === playerIdx) {
        if (owner && !owner.bankrupt && resolvedOwnerIdx !== null) {
          st.owner = resolvedOwnerIdx;
        } else {
          st.owner = null;
          st.level = 0;
        }
        refreshTileTextureAndBuildings(t.id);
      }
    });

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
      const creditorIdx = resolvedOwnerIdx !== null && resolvedOwnerIdx >= 0 ? resolvedOwnerIdx : null;
      broadcastAction('ACTION_BANKRUPTCY', {
        bankruptIdx: playerIdx,
        creditorIdx,
        paidCash: paid,
        soldTileIds: soldTiles.map(t => t.id),
        isDoubles: Boolean(isDoubles)
      });
      if (networkState.isHost) {
        broadcastFullGameState();
      }
    }

    if (soldTiles.length > 0) {
      cancelAllGameTimers();
      clearAuctionTimers();
      gameState.phase = 'AUCTION';
      updateRollButtonsUI(false);
      if (!networkState.isMultiplayer || networkState.isHost) {
        const delay = globalThis.__WT_TEST__ ? 0 : 2850;
        if (delay > 0) {
          setTimeout(() => {
            startSoldPropertiesAuctionSequence(soldTiles, playerIdx, Boolean(isDoubles));
          }, delay);
        } else {
          startSoldPropertiesAuctionSequence(soldTiles, playerIdx, Boolean(isDoubles));
        }
      }
      return;
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
      refreshTileTextureAndBuildings(tile.id);
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

  async handleAIOwnedCityLanding(playerIdx, tile, isDoubles) {
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
        upgradeCityLevel(tile.id, true);
        if (canDoTwo) upgradeCityLevel(tile.id, true);
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
}
