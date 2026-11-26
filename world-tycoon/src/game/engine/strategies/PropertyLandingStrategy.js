/**
 * game/engine/strategies/PropertyLandingStrategy.js
 * Strategy for landing on property tiles (Cities and Resorts).
 * Handles unowned acquisitions, rent transfers, debt liquidations, hostile buyouts, and upgrades.
 * AI heuristics are delegated to ./aiPropertyDecisions.js.
 */

import { ITileLandingStrategy } from './ITileLandingStrategy.js';
import { BOARD_TILES } from '../../data.js';
import { gameState, matchSettings, displayedCash } from '../../state.js';
import { fmtMoney } from '../../utils.js';
import { playSFX } from '../../audio.js';
import { getTileWorldPosition } from '../../../three/board/coords.js';
import { calculateTileRent, isTeammate, getTeamMembers } from '../../rules.js';
import {
  refreshTileTextureAndBuildings,
  showSpeechBubble,
  spawnShatterDebris,
  triggerBoardShockwave
} from '../../../three/scene.js';
import { animateBankruptcyQuake, animatePlayerEliminatedBanner } from '../../../ui/anim.js';
import {
  renderCornerHUDs,
  spawnFloatingCashOnHUD,
  logEvent,
  animateRentTransferOnHUD,
  setStatusPill
} from '../../../ui/hud.js';
import {
  openBuyCityModal,
  openBuyoutCityModal,
  calculateBuyoutCost,
  openSellCitiesModal,
  openUpgradeCityModal,
  upgradeCityLevel
} from '../../../ui/modals.js';
import { networkState, broadcastAction, broadcastFullGameState, isResponsibleForLandingMutation } from '../../../network/p2p.js';
import { scheduleSoldPropertiesAuction } from '../auction.js';
import {
  shouldAIBuyoutTile,
  resetBuyoutMemory,
  handleAIDebtorLiquidation,
  handleAICityDecision,
  handleAIBuyoutDecision,
  handleAIOwnedCityLanding
} from './aiPropertyDecisions.js';

export { shouldAIBuyoutTile, resetBuyoutMemory };

let rentDebtWatchdogTimer = null;

export function clearRentDebtWatchdog() {
  if (rentDebtWatchdogTimer) {
    clearTimeout(rentDebtWatchdogTimer);
    rentDebtWatchdogTimer = null;
  }
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
      await handleAICityDecision(playerIdx, tile, isDoubles);
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
          const didUpgrade = upgradeCityLevel(tile.id, true, playerIdx, 1);
          if (didUpgrade) {
            showSpeechBubble(`Upgraded ally ${partnerName}'s city! 🏗️`, 2200);
            if (networkState.isMultiplayer && networkState.isHost) {
              broadcastAction('ACTION_UPGRADE_CITY', { playerIdx, tileId: tile.id, count: 1, levelsToAdd: 1 });
              broadcastFullGameState();
            }
          }
        }
        if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
      } else {
        if (player.cash < (tile.houseCost || 0)) {
          showSpeechBubble(`Need ${fmtMoney(tile.houseCost)} to upgrade ${tile.name} 💸`, 2000);
          if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
          return;
        }
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
    const isResponsible = isResponsibleForLandingMutation(playerIdx, player);

    // Team Bailout: If player is insolvent, check if teammate can bail them out
    let teamBailoutCovered = false;
    if (player.cash < rent && matchSettings.teamMode && player.teamId !== undefined) {
      const deficit = rent - player.cash;
      const teammates = getTeamMembers(player.teamId).filter(idx => idx !== playerIdx && !gameState.players[idx]?.bankrupt);
      if (teammates.length > 0) {
        const partnerIdx = teammates[0];
        const partner = gameState.players[partnerIdx];
        if (partner && partner.cash >= deficit) {
          const shouldBailout = partner.isAI ? (partner.cash >= deficit + 200000) : (partner.cash >= deficit);
          if (shouldBailout) {
            teamBailoutCovered = true;
            if (isResponsible) {
              partner.cash -= deficit;
              player.cash += deficit;
              if (displayedCash) {
                displayedCash[partnerIdx] = partner.cash;
                displayedCash[playerIdx] = player.cash;
              }
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
    }

    // Insolvency check: Does player need to liquidate properties to pay rent?
    if (player.cash < rent && !teamBailoutCovered) {
      const owned = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === playerIdx);

      if (owned.length > 0) {
        if (player.isAI) {
          if (networkState.isMultiplayer && !networkState.isHost) {
            showSpeechBubble(`${player.name} is selling cities to pay rent...`, 2500);
            return;
          }
          await handleAIDebtorLiquidation(playerIdx, player, owner, rent, isDoubles, st.owner, (...args) => this.executeBankruptcy(...args));
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

            if (networkState.isHost) {
              clearRentDebtWatchdog();
              rentDebtWatchdogTimer = setTimeout(() => {
                rentDebtWatchdogTimer = null;
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
        if (isResponsible) {
          this.executeBankruptcy(playerIdx, player, owner, rent, tile, isDoubles, st.owner);
        } else {
          gameState.phase = 'MODAL';
        }
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

    if (isResponsible) {
      player.cash -= rent;
      owner.cash += rent;
      if (displayedCash) {
        displayedCash[playerIdx] = player.cash;
        displayedCash[st.owner] = owner.cash;
      }
      renderCornerHUDs();

      if (networkState.isMultiplayer) {
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
    const projectedCashAfterRent = isResponsible ? player.cash : (player.cash - rent);
    if (buyoutCost > 0) {
      if (player.isAI) {
        if (shouldAIBuyoutTile(playerIdx, tile, st, buyoutCost)) {
          if (networkState.isMultiplayer && !networkState.isHost) {
            showSpeechBubble(`${player.name} is considering a buyout of ${tile.name}...`, 2500);
            return;
          }
          await handleAIBuyoutDecision(playerIdx, tile, st, buyoutCost, isDoubles);
          return;
        }
      } else if (projectedCashAfterRent >= buyoutCost) {
        if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
          showSpeechBubble(`${player.name} is considering a buyout of ${tile.name}...`, 3000);
          setStatusPill(`⚔️ Waiting for <strong>${player.name}</strong> to decide on hostile buyout of <strong>${tile.name}</strong>...`, { isThinking: true, playerIdx });
          gameState.phase = 'MODAL';
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
        await handleAIOwnedCityLanding(playerIdx, tile, isDoubles);
      } else {
        if (player.cash < (tile.houseCost || 0)) {
          showSpeechBubble(`Need ${fmtMoney(tile.houseCost)} to upgrade ${tile.name} 💸`, 2000);
          logEvent(`🏠 <strong>${player.name}</strong> visited <strong>${tile.name}</strong> (Insufficient funds to upgrade).`);
          if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
          return;
        }
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
      scheduleSoldPropertiesAuction(soldTiles, playerIdx, Boolean(isDoubles), 2850);
      return;
    }

    if (window.concludeActionPhase) {
      window.concludeActionPhase(isDoubles);
    }
  }

  // Backward-compatible instance delegates
  handleAICityDecision(playerIdx, tile, isDoubles) {
    return handleAICityDecision(playerIdx, tile, isDoubles);
  }

  handleAIBuyoutDecision(playerIdx, tile, st, buyoutCost, isDoubles) {
    return handleAIBuyoutDecision(playerIdx, tile, st, buyoutCost, isDoubles);
  }

  handleAIOwnedCityLanding(playerIdx, tile, isDoubles) {
    return handleAIOwnedCityLanding(playerIdx, tile, isDoubles);
  }
}
