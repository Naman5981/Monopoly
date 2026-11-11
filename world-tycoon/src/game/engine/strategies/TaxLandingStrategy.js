/**
 * game/engine/strategies/TaxLandingStrategy.js
 * Strategy for luxury tax tile landing.
 * Implements Single Responsibility (SRP).
 */

import { ITileLandingStrategy } from './ITileLandingStrategy.js';
import { BOARD_TILES } from '../../data.js';
import { gameState } from '../../state.js';
import { fmtMoney } from '../../utils.js';
import { playSFX } from '../../audio.js';
import { refreshTileTextureAndBuildings, triggerTokenHurtAnimation, showSpeechBubble, spawnShatterDebris, triggerBoardShockwave } from '../../../three/scene.js';
import { renderCornerHUDs, spawnFloatingCashOnHUD, logEvent, setPlayerPortraitMood, setStatusPill } from '../../../ui/hud.js';
import { openSellCitiesModal, calculatePropertySaleValue } from '../../../ui/modals.js';
import { animatePlayerEliminatedBanner, animateBankruptcyQuake } from '../../../ui/anim.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../../network/p2p.js';
import { concludeActionPhase } from '../turnCycle.js';

export class TaxLandingStrategy extends ITileLandingStrategy {
  async execute(context) {
    const { playerIdx, player, tile, isDoubles } = context;
    const taxAmt = tile.amount || 250000;

    // Check if player has enough cash to pay tax directly
    if (player.cash >= taxAmt) {
      player.cash -= taxAmt;
      gameState.festivalPot += taxAmt;

      setPlayerPortraitMood(playerIdx, 'crying', 3000);
      spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(taxAmt)} Tax`, false);
      triggerTokenHurtAnimation(playerIdx);
      logEvent(`🏛️ <strong>${player.name}</strong> paid <strong>${fmtMoney(taxAmt)}</strong> Luxury Tax into the Festival Pool.`);
      renderCornerHUDs();

      if (concludeActionPhase) {
        concludeActionPhase(isDoubles);
      } else if (window.concludeActionPhase) {
        window.concludeActionPhase(isDoubles);
      }
      return;
    }

    // Player cannot afford tax: check if they have properties to liquidate
    const owned = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === playerIdx);

    if (owned.length > 0) {
      if (player.isAI) {
        // AI auto-liquidates cheapest properties
        owned.sort((a, b) => {
          const valA = calculatePropertySaleValue(a, gameState.properties[a.id]);
          const valB = calculatePropertySaleValue(b, gameState.properties[b.id]);
          return valA - valB;
        });

        for (const t of owned) {
          if (player.cash >= taxAmt) break;
          const st = gameState.properties[t.id];
          const saleVal = calculatePropertySaleValue(t, st);
          st.owner = null;
          st.level = 0;
          st.mortgaged = false;
          player.cash += saleVal;
          refreshTileTextureAndBuildings(t.id);
          logEvent(`🤖 <strong>${player.name}</strong> liquidated <strong>${t.name}</strong> for <strong>${fmtMoney(saleVal)}</strong> to pay Luxury Tax.`);
        }

        if (player.cash >= taxAmt) {
          player.cash -= taxAmt;
          gameState.festivalPot += taxAmt;
          playSFX('cash');
          logEvent(`🏛️ <strong>${player.name}</strong> paid <strong>${fmtMoney(taxAmt)}</strong> Luxury Tax into the Festival Pool.`);
          renderCornerHUDs();
          if (networkState.isMultiplayer && networkState.isHost) {
            broadcastFullGameState();
          }
          if (concludeActionPhase) {
            concludeActionPhase(isDoubles);
          } else if (window.concludeActionPhase) {
            window.concludeActionPhase(isDoubles);
          }
          return;
        }
      } else {
        // Human player debt liquidation modal
        if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
          showSpeechBubble(`${player.name} is selling cities to pay Luxury Tax...`, 3000);
          setStatusPill(`💸 Waiting for <strong>${player.name}</strong> to sell cities to pay <strong>${fmtMoney(taxAmt)}</strong> tax...`, { isThinking: true, playerIdx });
          gameState.phase = 'MODAL';
          gameState.pendingRentDebt = {
            tile,
            rentOwed: taxAmt,
            creditorIdx: null,
            debtorIdx: playerIdx,
            isDoubles: Boolean(isDoubles),
            isTax: true
          };
          logEvent(`💸 <strong>${player.name}</strong> is selling cities to pay <strong>${fmtMoney(taxAmt)}</strong> Luxury Tax.`);
          broadcastAction('ACTION_RENT_DEBT', {
            debtorIdx: playerIdx,
            creditorIdx: null,
            rentOwed: taxAmt,
            tileId: tile.id,
            isDoubles: Boolean(isDoubles)
          });
          return;
        }

        logEvent(`💸 <strong>${player.name}</strong> owes <strong>${fmtMoney(taxAmt)}</strong> Luxury Tax and must liquidate properties.`);
        if (networkState.isMultiplayer) {
          broadcastAction('ACTION_RENT_DEBT', {
            debtorIdx: playerIdx,
            creditorIdx: null,
            rentOwed: taxAmt,
            tileId: tile.id,
            isDoubles: Boolean(isDoubles)
          });
        }
        openSellCitiesModal(tile, taxAmt, null, isDoubles, playerIdx);
        if (gameState.pendingRentDebt) {
          gameState.pendingRentDebt.isTax = true;
        }
        return;
      }
    }

    // Player owns 0 properties and cash < taxAmt: Total Bankruptcy to the Bank
    const paid = Math.max(0, player.cash);
    player.cash = 0;
    gameState.festivalPot += paid;
    player.bankrupt = true;

    // Reset any lingering properties
    BOARD_TILES.forEach(t => {
      const st = gameState.properties[t.id];
      if (st && st.owner === playerIdx) {
        st.owner = null;
        st.level = 0;
        refreshTileTextureAndBuildings(t.id);
      }
    });

    playSFX('bankrupt');
    showSpeechBubble('Bankrupt! 💥', 2500);
    logEvent(`💥 <strong>${player.name}</strong> has no cities left and could only contribute <strong>${fmtMoney(paid)}</strong> of <strong>${fmtMoney(taxAmt)}</strong> Luxury Tax. <strong>BANKRUPT!</strong>`);

    renderCornerHUDs();
    animatePlayerEliminatedBanner(player, null);
    animateBankruptcyQuake(playerIdx);
    spawnShatterDebris(0, 0, 0xef4444, 36);
    triggerBoardShockwave(0, 0, 26, 32);

    if (networkState.isMultiplayer) {
      broadcastAction('ACTION_BANKRUPTCY', {
        bankruptIdx: playerIdx,
        creditorIdx: null,
        paidCash: paid
      });
      if (networkState.isHost) {
        broadcastFullGameState();
      }
    }

    if (concludeActionPhase) {
      concludeActionPhase(isDoubles);
    } else if (window.concludeActionPhase) {
      window.concludeActionPhase(isDoubles);
    }
  }
}
