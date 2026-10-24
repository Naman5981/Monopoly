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
  flyPlayerDirectFlightAnimation
} from '../../three/scene.js';
import { renderCornerHUDs, spawnFloatingCashOnHUD, logEvent, setStatusPill } from '../../ui/hud.js';
import { networkState, broadcastAction } from '../../network/p2p.js';
import { animateGoSalaryStream } from '../../ui/anim.js';
import { showChanceAwardPopup } from '../../ui/modals/chanceWheel.js';

export async function executeAIChanceSpin(playerIdx, isDoubles, getGameDelay) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  const p = gameState.players[playerIdx];
  setStatusPill(`🎡 <strong>${p.name}</strong> is spinning the Chance Wheel...`, { isThinking: true, playerIdx });
  const prize = CHANCE_WHEEL_PRIZES[Math.floor(Math.random() * CHANCE_WHEEL_PRIZES.length)];
  showSpeechBubble(`Chance: ${prize.label}!`, 1800);
  const delay = typeof getGameDelay === 'function' ? getGameDelay(700) : 700;
  await new Promise(r => setTimeout(r, delay));
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;

  // Broadcast to all peers in multiplayer so guests also see the AI bot's chance card popup
  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastAction('ACTION_CHANCE_PRIZE', {
      playerIdx,
      prize,
      isDoubles: Boolean(isDoubles)
    });
  }

  // Show the chance award popup
  showChanceAwardPopup(prize, async () => {
    await applyChancePrize(playerIdx, prize, isDoubles, false, false);
  }, playerIdx);
}

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
    p.cash -= prize.amount;
    gameState.festivalPot += prize.amount;
    showSpeechBubble(`💸 -${fmtMoney(prize.amount)} Tax!`, 2200);
    spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(prize.amount)} Tax`, false);
    triggerTokenHurtAnimation(playerIdx);
    playSFX('hurt');
    checkAndHandleNegativeCash(playerIdx, {
      onRefreshTile: refreshTileTextureAndBuildings,
      onLog: logEvent
    });
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
