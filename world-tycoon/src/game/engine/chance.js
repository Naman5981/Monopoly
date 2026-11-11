/**
 * game/engine/chance.js
 * Chance wheel prize resolution: cash rewards, tax deductions, island detention, and express jet flights.
 */

import { BOARD_TILES, CHANCE_WHEEL_PRIZES } from '../data.js';
import { gameState } from '../state.js';
import { fmtMoney } from '../utils.js';
import { playSFX } from '../audio.js';
import { checkAndHandleNegativeCash } from '../rules.js';
import {
  resetTokenAfterHop,
  updatePlayerTokenPositions3D,
  triggerTokenHurtAnimation,
  showSpeechBubble,
  refreshTileTextureAndBuildings,
  setTileHighlightRing,
  flyPlayerDirectFlightAnimation,
  spawnShatterDebris,
  triggerBoardShockwave
} from '../../three/scene.js';
import { renderCornerHUDs, spawnFloatingCashOnHUD, logEvent, setStatusPill } from '../../ui/hud.js';
import { networkState, broadcastAction, broadcastFullGameState } from '../../network/p2p.js';
import { animateGoSalaryStream, animatePlayerEliminatedBanner, animateBankruptcyQuake } from '../../ui/anim.js';
import { openSellCitiesModal, calculatePropertySaleValue } from '../../ui/modals.js';

export async function applyChancePrize(playerIdx, prize, isDoubles, isRemote = false, shouldBroadcast = false) {
  const p = gameState.players[playerIdx];
  if (!p) return;

  if (shouldBroadcast && networkState.isMultiplayer && !isRemote) {
    broadcastAction('ACTION_CHANCE_PRIZE', { playerIdx, prize, isDoubles: Boolean(isDoubles) });
  }

  logEvent(`🌈 <strong>${p.name}</strong> spun Chance: <em>${prize.desc}</em>`);

  if (prize.type === 'cash') {
    p.cash += prize.amount;
    playSFX('cash');
    playSFX('win');
    showSpeechBubble(`🎉 +${fmtMoney(prize.amount)}!`, 2200);
    spawnFloatingCashOnHUD(playerIdx, `+${fmtMoney(prize.amount)}`, true);
  } else if (prize.type === 'tax') {
    if (p.cash >= prize.amount) {
      p.cash -= prize.amount;
      gameState.festivalPot += prize.amount;
      showSpeechBubble(`💸 -${fmtMoney(prize.amount)} Tax!`, 2200);
      spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(prize.amount)} Tax`, false);
      triggerTokenHurtAnimation(playerIdx);
      playSFX('hurt');
    } else {
      const owned = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === playerIdx);
      if (owned.length > 0) {
        if (p.isAI) {
          owned.sort((a, b) => {
            const valA = calculatePropertySaleValue(a, gameState.properties[a.id]);
            const valB = calculatePropertySaleValue(b, gameState.properties[b.id]);
            return valA - valB;
          });

          for (const t of owned) {
            if (p.cash >= prize.amount) break;
            const st = gameState.properties[t.id];
            const saleVal = calculatePropertySaleValue(t, st);
            st.owner = null;
            st.level = 0;
            st.mortgaged = false;
            p.cash += saleVal;
            refreshTileTextureAndBuildings(t.id);
            logEvent(`🤖 <strong>${p.name}</strong> sold <strong>${t.name}</strong> for <strong>${fmtMoney(saleVal)}</strong> to pay Chance tax.`);
          }

          if (p.cash >= prize.amount) {
            p.cash -= prize.amount;
            gameState.festivalPot += prize.amount;
            playSFX('cash');
            logEvent(`🏛️ <strong>${p.name}</strong> paid <strong>${fmtMoney(prize.amount)}</strong> Chance fine into the Festival Pool.`);
            renderCornerHUDs();
            if (networkState.isMultiplayer && networkState.isHost) {
              broadcastFullGameState();
            }
          } else {
            // Still cannot afford fine
            const paid = Math.max(0, p.cash);
            p.cash = 0;
            gameState.festivalPot += paid;
            p.bankrupt = true;
            BOARD_TILES.forEach(t => {
              const st = gameState.properties[t.id];
              if (st && st.owner === playerIdx) {
                st.owner = null;
                st.level = 0;
                refreshTileTextureAndBuildings(t.id);
              }
            });
            playSFX('bankrupt');
            animatePlayerEliminatedBanner(p, null);
            animateBankruptcyQuake(playerIdx);
            spawnShatterDebris(0, 0, 0xef4444, 36);
            triggerBoardShockwave(0, 0, 26, 32);
            logEvent(`💥 <strong>${p.name}</strong> went BANKRUPT paying Chance fine.`);
            if (networkState.isMultiplayer) {
              broadcastAction('ACTION_BANKRUPTCY', { bankruptIdx: playerIdx, creditorIdx: null, paidCash: paid });
              if (networkState.isHost) broadcastFullGameState();
            }
          }
        } else {
          // Human player
          const curTile = BOARD_TILES[p.position] || { id: p.position, name: 'Chance' };
          if (networkState.isMultiplayer && playerIdx !== networkState.localPlayerIdx) {
            showSpeechBubble(`${p.name} is selling cities to pay fine...`, 3000);
            setStatusPill(`💸 Waiting for <strong>${p.name}</strong> to sell cities to pay <strong>${fmtMoney(prize.amount)}</strong> fine...`, { isThinking: true, playerIdx });
            gameState.phase = 'MODAL';
            gameState.pendingRentDebt = {
              tile: curTile,
              rentOwed: prize.amount,
              creditorIdx: null,
              debtorIdx: playerIdx,
              isDoubles: Boolean(isDoubles),
              isTax: true
            };
            broadcastAction('ACTION_RENT_DEBT', {
              debtorIdx: playerIdx,
              creditorIdx: null,
              rentOwed: prize.amount,
              tileId: curTile.id,
              isDoubles: Boolean(isDoubles)
            });
            return;
          }

          logEvent(`💸 <strong>${p.name}</strong> owes <strong>${fmtMoney(prize.amount)}</strong> fine and must liquidate properties.`);
          if (networkState.isMultiplayer) {
            broadcastAction('ACTION_RENT_DEBT', {
              debtorIdx: playerIdx,
              creditorIdx: null,
              rentOwed: prize.amount,
              tileId: curTile.id,
              isDoubles: Boolean(isDoubles)
            });
          }
          openSellCitiesModal(curTile, prize.amount, null, isDoubles, playerIdx);
          if (gameState.pendingRentDebt) {
            gameState.pendingRentDebt.isTax = true;
          }
          return;
        }
      } else {
        // Debtor owns 0 properties: Bankrupt
        const paid = Math.max(0, p.cash);
        p.cash = 0;
        gameState.festivalPot += paid;
        p.bankrupt = true;
        playSFX('bankrupt');
        animatePlayerEliminatedBanner(p, null);
        animateBankruptcyQuake(playerIdx);
        spawnShatterDebris(0, 0, 0xef4444, 36);
        triggerBoardShockwave(0, 0, 26, 32);
        logEvent(`💥 <strong>${p.name}</strong> went BANKRUPT paying Chance fine.`);
        if (networkState.isMultiplayer) {
          broadcastAction('ACTION_BANKRUPTCY', { bankruptIdx: playerIdx, creditorIdx: null, paidCash: paid });
          if (networkState.isHost) broadcastFullGameState();
        }
      }
    }
  } else if (prize.type === 'island') {
    const fromPos = p.position;
    gameState.phase = 'MOVING';
    playSFX('jail');
    setTileHighlightRing(8, true);
    showSpeechBubble('🏝️ Detained on Tropical Island!', 2800);
    await flyPlayerDirectFlightAnimation(playerIdx, fromPos, 8);
    p.position = 8;
    p.inIsland = true;
    p.islandTurns = 0;
    resetTokenAfterHop(playerIdx);
    updatePlayerTokenPositions3D();
    playSFX('hop');
    setTimeout(() => setTileHighlightRing(8, false), 900);
    renderCornerHUDs();
    if (window.concludeActionPhase) window.concludeActionPhase(false);
    return;
  } else if (prize.type === 'move') {
    const fromPos = p.position;
    const dest = prize.target;
    gameState.phase = 'MOVING';

    playSFX('flight');
    setTileHighlightRing(dest, true);

    if (dest === 0) {
      showSpeechBubble('🚀 Express Jet to START!', 2500);
      await flyPlayerDirectFlightAnimation(playerIdx, fromPos, 0);
      p.position = 0;
      resetTokenAfterHop(playerIdx);
      updatePlayerTokenPositions3D();
      playSFX('hop');
      setTimeout(() => setTileHighlightRing(0, false), 900);
      const salary = 300000;
      p.cash += salary;
      playSFX('cash');
      spawnFloatingCashOnHUD(playerIdx, `+${fmtMoney(salary)} START`, true);
      animateGoSalaryStream(playerIdx, fmtMoney(salary));
      logEvent(`💰 <strong>${p.name}</strong> landed on <strong>START</strong> and collected <strong>${fmtMoney(salary)}</strong> salary.`);
    } else {
      showSpeechBubble(`✈️ Flying to ${BOARD_TILES[dest]?.name || 'Destination'}!`, 2500);
      await flyPlayerDirectFlightAnimation(playerIdx, fromPos, dest);
      p.position = dest;
      resetTokenAfterHop(playerIdx);
      updatePlayerTokenPositions3D();
      playSFX('hop');
      setTimeout(() => setTileHighlightRing(dest, false), 900);
      showSpeechBubble(`🛬 Landed on ${BOARD_TILES[dest]?.name || 'Destination'}!`, 2200);
      // Give the player a clear visual pause to witness the avatar landing on World Tour before opening flight selection mode
      await new Promise(r => setTimeout(r, 650));
    }
    renderCornerHUDs();
    if (window.evaluateTileLanding) {
      await window.evaluateTileLanding(playerIdx, isDoubles);
    }
    return;
  }
  renderCornerHUDs();
  if (window.concludeActionPhase) window.concludeActionPhase(isDoubles);
}
