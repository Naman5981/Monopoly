/**
 * game/debug/actions.js
 * Granular debugging operations: rolls, teleports, ownership, cash, turns, and AI freezing.
 */

import { BOARD_TILES, GROUP_META, CHANCE_WHEEL_PRIZES } from '../data.js';
import { gameState, displayedCash, debugState, isHumanTurnActionable } from '../state.js';
import { fmtMoney } from '../utils.js';
import { playSFX } from '../audio.js';
import { checkVictoryConditions } from '../rules.js';
import {
  refreshTileTextureAndBuildings,
  updatePlayerTokenPositions3D,
  showSpeechBubble
} from '../../three/scene.js';
import {
  renderCornerHUDs,
  logEvent,
  spawnFloatingCashOnHUD,
  updateRollButtonsUI
} from '../../ui/hud.js';
import {
  openChanceWheelModal,
  openMonopolyCelebrationModal,
  checkAndTriggerMonopoly,
  showVictoryModal,
  closeAllGameModals
} from '../../ui/modals.js';
import {
  executePlayerRoll,
  evaluateTileLanding,
  hopPlayerSteps3D,
  advanceTurn,
  cancelAllGameTimers,
  startNewMatch,
  applyChancePrize
} from '../engine.js';
import { fireConfettiBurst, spawnAnimatedReaction } from '../../three/effects.js';
import { saveCurrentMatchToStorage } from '../persistence.js';

/** Ensure a game match is active, otherwise start one automatically. */
export function ensureGameStarted() {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') {
    logEvent(`⚡ [DEBUG] Auto-starting fresh match for testing...`);
    startNewMatch();
  }
}

/** Force a specific dice roll for the active player (or specified player). */
export async function debugRoll(d1, d2, playerIdx = null) {
  ensureGameStarted();

  d1 = Math.max(1, Math.min(6, parseInt(d1, 10) || 1));
  d2 = Math.max(1, Math.min(6, parseInt(d2, 10) || 1));

  if (playerIdx !== null && playerIdx !== undefined && playerIdx !== gameState.currentPlayerIdx) {
    debugForceTurn(playerIdx);
    await new Promise(r => setTimeout(r, 100));
  }

  cancelAllGameTimers();
  closeAllGameModals();

  gameState.phase = 'ROLL';
  updateRollButtonsUI(isHumanTurnActionable());

  logEvent(`🎲 <strong>[DEBUG]</strong> Forcing roll: <strong>${d1} + ${d2} = ${d1 + d2}</strong>${d1 === d2 ? ' (DOUBLES!)' : ''}`);
  await executePlayerRoll(d1, d2);
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Teleport player to any tile with optional landing evaluation or step hopping. */
export async function debugTeleport(playerIdx, tileId, triggerLanding = true, hopAnimate = false) {
  ensureGameStarted();

  playerIdx = playerIdx ?? gameState.currentPlayerIdx;
  const p = gameState.players[playerIdx];
  if (!p) return;

  tileId = ((parseInt(tileId, 10) % 32) + 32) % 32;
  const targetTile = BOARD_TILES[tileId];

  cancelAllGameTimers();
  closeAllGameModals();

  if (hopAnimate) {
    const steps = ((tileId - p.position) % 32 + 32) % 32 || 32;
    showSpeechBubble(`[DEBUG] Hopping ${steps} steps to ${targetTile.name}...`, 2000);
    logEvent(`🏃 <strong>[DEBUG]</strong> <strong>${p.name}</strong> hopping ${steps} steps to <strong>${targetTile.name}</strong>.`);
    gameState.phase = 'MOVING';
    await hopPlayerSteps3D(playerIdx, steps);
    if (triggerLanding) {
      await evaluateTileLanding(playerIdx, false);
    } else {
      gameState.phase = 'ROLL';
      updateRollButtonsUI(isHumanTurnActionable());
    }
  } else {
    const prevPos = p.position;
    p.position = tileId;
    updatePlayerTokenPositions3D();
    playSFX('hop');
    showSpeechBubble(`[DEBUG] Teleported to ${targetTile.name}!`, 2000);
    logEvent(`🚀 <strong>[DEBUG]</strong> Teleported <strong>${p.name}</strong> from <em>${BOARD_TILES[prevPos].name}</em> to <strong>${targetTile.name}</strong>.`);
    renderCornerHUDs();

    if (triggerLanding) {
      await evaluateTileLanding(playerIdx, false);
    } else {
      gameState.phase = 'ROLL';
      updateRollButtonsUI(isHumanTurnActionable());
    }
  }

  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Assign or clear ownership of a city or resort. */
export function debugSetPropertyOwner(tileId, playerIdx, chargePrice = false) {
  ensureGameStarted();

  tileId = parseInt(tileId, 10);
  const tile = BOARD_TILES[tileId];
  if (!tile || (tile.type !== 'city' && tile.type !== 'resort')) {
    logEvent(`⚠️ [DEBUG] Tile ${tileId} is not a purchasable property.`);
    return;
  }

  const st = gameState.properties[tileId];
  if (!st) return;

  if (playerIdx === null || playerIdx === undefined || playerIdx === '' || playerIdx < 0) {
    st.owner = null;
    st.level = 0;
    st.festivalBoost = false;
    logEvent(`🧹 <strong>[DEBUG]</strong> Property <strong>${tile.name}</strong> reset to BANK.`);
  } else {
    playerIdx = parseInt(playerIdx, 10);
    const p = gameState.players[playerIdx];
    if (!p) return;

    if (chargePrice) {
      p.cash -= tile.price;
      spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(tile.price)}`, false);
    }
    st.owner = playerIdx;
    playSFX('build');
    logEvent(`🏙️ <strong>[DEBUG]</strong> Assigned <strong>${tile.name}</strong> to <strong>${p.name}</strong> (${chargePrice ? `cost ${fmtMoney(tile.price)}` : 'free'}).`);

    if (tile.group) {
      checkAndTriggerMonopoly(playerIdx, tile.group);
    }

    const vic = checkVictoryConditions();
    if (vic) {
      showVictoryModal(vic.winner, vic);
      return;
    }
  }

  refreshTileTextureAndBuildings(tileId);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Set building tier (0 to 4) on a city. */
export function debugSetPropertyLevel(tileId, level) {
  ensureGameStarted();

  tileId = parseInt(tileId, 10);
  const tile = BOARD_TILES[tileId];
  if (!tile || tile.type !== 'city') {
    logEvent(`⚠️ [DEBUG] Tile ${tileId} is not a city with building tiers.`);
    return;
  }

  const st = gameState.properties[tileId];
  if (!st) return;

  level = Math.max(0, Math.min(4, parseInt(level, 10) || 0));
  st.level = level;
  playSFX('build');

  const tierNames = ['Vacant (0)', '1 House (1)', '2 Houses (2)', 'Hotel (3)', 'Landmark (4)'];
  logEvent(`🏗️ <strong>[DEBUG]</strong> Set <strong>${tile.name}</strong> to <strong>${tierNames[level]}</strong>.`);

  refreshTileTextureAndBuildings(tileId);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Toggle 2x Festival Boost on a city. */
export function debugToggleFestivalBoost(tileId) {
  ensureGameStarted();

  tileId = parseInt(tileId, 10);
  const tile = BOARD_TILES[tileId];
  const st = gameState.properties[tileId];
  if (!tile || !st) return;

  st.festivalBoost = !st.festivalBoost;
  playSFX('cash');
  logEvent(`✨ <strong>[DEBUG]</strong> <strong>${tile.name}</strong> Festival 2× Boost is now <strong>${st.festivalBoost ? 'ENABLED' : 'DISABLED'}</strong>.`);

  refreshTileTextureAndBuildings(tileId);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Grant a complete color group monopoly to a player. */
export function debugGrantMonopoly(groupKey, playerIdx, level = 0) {
  ensureGameStarted();

  const groupTiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === groupKey);
  if (groupTiles.length === 0) return;

  playerIdx = parseInt(playerIdx, 10);
  const p = gameState.players[playerIdx];
  if (!p) return;

  groupTiles.forEach(t => {
    const st = gameState.properties[t.id];
    if (st) {
      st.owner = playerIdx;
      st.level = Math.max(0, Math.min(4, level));
      refreshTileTextureAndBuildings(t.id);
    }
  });

  playSFX('monopoly');
  fireConfettiBurst();
  openMonopolyCelebrationModal(playerIdx, groupKey);

  const groupName = GROUP_META[groupKey]?.name || groupKey;
  logEvent(`👑 <strong>[DEBUG]</strong> Granted full <strong>${groupName}</strong> Monopoly to <strong>${p.name}</strong>!`);

  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (window.syncDebugUIState) window.syncDebugUIState();

  const vic = checkVictoryConditions();
  if (vic) {
    showVictoryModal(vic.winner, vic);
  }
}

/** Clear group ownership back to Bank. */
export function debugClearGroup(groupKey) {
  ensureGameStarted();

  const groupTiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === groupKey);
  groupTiles.forEach(t => {
    const st = gameState.properties[t.id];
    if (st) {
      st.owner = null;
      st.level = 0;
      st.festivalBoost = false;
      refreshTileTextureAndBuildings(t.id);
    }
  });

  logEvent(`🧹 <strong>[DEBUG]</strong> Cleared ownership of group <strong>${GROUP_META[groupKey]?.name || groupKey}</strong>.`);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Adjust player cash by delta (+/-). */
export function debugAdjustCash(playerIdx, delta) {
  ensureGameStarted();

  playerIdx = parseInt(playerIdx, 10);
  const p = gameState.players[playerIdx];
  if (!p) return;

  delta = parseInt(delta, 10) || 0;
  p.cash += delta;
  displayedCash[playerIdx] = p.cash;

  playSFX('cash');
  spawnFloatingCashOnHUD(playerIdx, `${delta >= 0 ? '+' : ''}${fmtMoney(delta)}`, delta >= 0);
  logEvent(`💵 <strong>[DEBUG]</strong> Adjusted <strong>${p.name}</strong> cash by <strong>${fmtMoney(delta)}</strong> (New balance: ${fmtMoney(p.cash)}).`);

  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Set player cash to an exact number. */
export function debugSetCash(playerIdx, amount) {
  ensureGameStarted();

  playerIdx = parseInt(playerIdx, 10);
  const p = gameState.players[playerIdx];
  if (!p) return;

  amount = parseInt(amount, 10) || 0;
  p.cash = amount;
  displayedCash[playerIdx] = p.cash;

  logEvent(`💵 <strong>[DEBUG]</strong> Set <strong>${p.name}</strong> cash to <strong>${fmtMoney(p.cash)}</strong>.`);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Toggle or force player island detention status. */
export function debugToggleIsland(playerIdx, forceIsland = null) {
  ensureGameStarted();

  playerIdx = parseInt(playerIdx, 10);
  const p = gameState.players[playerIdx];
  if (!p) return;

  const inIsland = forceIsland !== null ? forceIsland : !p.inIsland;
  p.inIsland = inIsland;
  p.islandTurns = 0;

  if (inIsland) {
    p.position = 8;
    updatePlayerTokenPositions3D();
    playSFX('hop');
    showSpeechBubble(`[DEBUG] Detained on Tropical Island!`, 2000);
    logEvent(`🏝️ <strong>[DEBUG]</strong> Detained <strong>${p.name}</strong> on the Tropical Island.`);
  } else {
    showSpeechBubble(`[DEBUG] Released from Island!`, 2000);
    logEvent(`🔓 <strong>[DEBUG]</strong> Released <strong>${p.name}</strong> from Island.`);
  }

  renderCornerHUDs();
  updateRollButtonsUI(isHumanTurnActionable());
  saveCurrentMatchToStorage();
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Force active turn to a specific player. */
export function debugForceTurn(playerIdx) {
  ensureGameStarted();

  playerIdx = parseInt(playerIdx, 10);
  const p = gameState.players[playerIdx];
  if (!p) return;

  cancelAllGameTimers();
  gameState.currentPlayerIdx = playerIdx;
  gameState.phase = 'ROLL';
  gameState.doublesCount = 0;
  gameState.turnTimeLeft = 15;

  showSpeechBubble(`[DEBUG] Turn forced to ${p.name}!`, 2000);
  logEvent(`👑 <strong>[DEBUG]</strong> Active turn transferred to <strong>${p.name}</strong>.`);

  renderCornerHUDs();
  updateRollButtonsUI(isHumanTurnActionable());
  saveCurrentMatchToStorage();
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Advance turn to next player immediately. */
export function debugAdvanceTurn() {
  ensureGameStarted();
  cancelAllGameTimers();
  advanceTurn();
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Toggle freezing AI autoplay. */
export function debugToggleFreezeAI(forceValue = null) {
  debugState.freezeAI = forceValue !== null ? forceValue : !debugState.freezeAI;

  const badge = document.getElementById('debug-ai-badge');
  const checkbox = document.getElementById('debug-chk-freeze-ai');

  if (checkbox) checkbox.checked = debugState.freezeAI;
  if (badge) {
    if (debugState.freezeAI) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  logEvent(`⏸️ <strong>[DEBUG]</strong> AI Autoplay is now <strong>${debugState.freezeAI ? 'PAUSED (Frozen)' : 'ACTIVE (Autonomous)'}</strong>.`);
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Step AI action once if AI is currently active and paused. */
export async function debugStepAI() {
  ensureGameStarted();
  const p = gameState.players[gameState.currentPlayerIdx];
  if (!p || !p.isAI) {
    logEvent(`⚠️ [DEBUG] Current player is human, not AI.`);
    return;
  }

  if (gameState.phase === 'ROLL') {
    logEvent(`▶️ <strong>[DEBUG]</strong> Stepping AI roll for <strong>${p.name}</strong>...`);
    await executePlayerRoll();
  } else if (gameState.phase === 'END') {
    logEvent(`▶️ <strong>[DEBUG]</strong> Advancing AI turn for <strong>${p.name}</strong>...`);
    advanceTurn();
  } else {
    logEvent(`ℹ️ [DEBUG] AI is in phase ${gameState.phase}. Concluding phase...`);
    advanceTurn();
  }
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Trigger Chance Prize directly or open the spinning wheel. */
export async function debugTriggerChancePrize(prizeIdx = null, playerIdx = null) {
  ensureGameStarted();
  playerIdx = playerIdx ?? gameState.currentPlayerIdx;

  if (prizeIdx === null || prizeIdx === '' || prizeIdx === undefined) {
    openChanceWheelModal(false);
    return;
  }

  prizeIdx = parseInt(prizeIdx, 10);
  const prize = CHANCE_WHEEL_PRIZES[prizeIdx] || CHANCE_WHEEL_PRIZES[0];
  const p = gameState.players[playerIdx];

  logEvent(`🌈 <strong>[DEBUG]</strong> Applying Chance prize to <strong>${p.name}</strong>: <em>${prize.desc}</em>`);

  await applyChancePrize(playerIdx, prize, false);

  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Trigger Festival jackpot payout & city 2x boost. */
export function debugTriggerFestivalJackpot(playerIdx = null) {
  ensureGameStarted();
  playerIdx = playerIdx ?? gameState.currentPlayerIdx;
  const p = gameState.players[playerIdx];
  if (!p) return;

  const pot = gameState.festivalPot > 0 ? gameState.festivalPot : 1000000;
  p.cash += pot;
  gameState.festivalPot = 0;

  playSFX('cash');
  spawnAnimatedReaction('cash');
  spawnFloatingCashOnHUD(playerIdx, `+${fmtMoney(pot)} Festival!`, true);
  logEvent(`🎉 <strong>[DEBUG]</strong> <strong>${p.name}</strong> won the <strong>${fmtMoney(pot)}</strong> Festival Jackpot!`);

  const myCities = BOARD_TILES.filter(t => t.type === 'city' && gameState.properties[t.id]?.owner === playerIdx);
  if (myCities.length > 0) {
    const target = myCities[0];
    gameState.properties[target.id].festivalBoost = true;
    refreshTileTextureAndBuildings(target.id);
    logEvent(`✨ <strong>[DEBUG]</strong> Boosted <strong>${target.name}</strong> rent by 2×!`);
  }

  renderCornerHUDs();
  saveCurrentMatchToStorage();
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Adjust Festival Pool Pot. */
export function debugAdjustFestivalPot(delta) {
  ensureGameStarted();
  delta = parseInt(delta, 10) || 0;
  if (delta < 0 && Math.abs(delta) > gameState.festivalPot) {
    gameState.festivalPot = 0;
  } else {
    gameState.festivalPot += delta;
  }
  logEvent(`🏛️ <strong>[DEBUG]</strong> Festival Pot is now <strong>${fmtMoney(gameState.festivalPot)}</strong>.`);
  if (window.syncDebugUIState) window.syncDebugUIState();
}

/** Trigger Victory Modal for testing end-of-game celebration. */
export function debugTriggerVictory(playerIdx = null) {
  ensureGameStarted();
  cancelAllGameTimers();
  playerIdx = playerIdx ?? gameState.currentPlayerIdx ?? 0;
  const p = (gameState.players && gameState.players[playerIdx]) || { id: 0, name: 'Player 1', cash: 5400000, isAI: false };
  showVictoryModal(p, {
    type: 'supremacy',
    title: 'GLOBAL TYCOON SUPREMACY!',
    desc: 'Victory triggered via Debug Suite test.'
  });
  if (window.syncDebugUIState) window.syncDebugUIState();
}
