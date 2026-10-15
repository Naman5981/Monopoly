/**
 * game/debug.js
 * Developer & QA Testing Suite for World Tycoon: Global Edition.
 *
 * Provides granular controls for:
 * - Forced dice rolling (exact die 1 & 2, doubles, custom totals)
 * - Tile teleportation & landing evaluation (rent, buy, chance, jail, festival, tax, flight)
 * - Instant city/resort ownership assignment, 3D building tiers (0-4), mortgage, and festival boost
 * - Complete color group monopolies with instant celebration & 2x rent logic
 * - Player cash adjustments, bankruptcy triggering, revival, and island detention controls
 * - Turn forcing, skipping, and AI autoplay freezing / manual stepping
 * - Instant trigger of game events (Chance Wheel, World Tour, Festival, Auction, Trade, Victory)
 * - Pre-configured 1-click test scenarios (Rent squeeze, Island escape, Monopoly ready, etc.)
 * - Rich in-game floating UI + DevTools console API (window.debug)
 */

import { BOARD_TILES, GROUP_META, PLAYER_THEMES, CHANCE_WHEEL_PRIZES } from './data.js';
import { gameState, displayedCash, debugState, isHumanTurnActionable, matchSettings } from './state.js';
import { fmtMoney } from './utils.js';
import { playSFX } from './audio.js';
import { calculateTileRent, ownsFullColorGroup, checkAndHandleNegativeCash, checkVictoryConditions } from './rules.js';
import {
  refreshTileTextureAndBuildings,
  updatePlayerTokenPositions3D,
  showSpeechBubble,
  getTileWorldPosition,
  setTileHighlightRing,
  setFlightModeHighlights
} from '../three/scene.js';
import {
  renderCornerHUDs,
  logEvent,
  spawnFloatingCashOnHUD,
  updateRollButtonsUI
} from '../ui/hud.js';
import {
  openBuyCityModal,
  openUpgradeCityModal,
  openChanceWheelModal,
  startCityAuction,
  openTradeModal,
  openInspectorModal,
  openMonopolyCelebrationModal,
  checkAndTriggerMonopoly,
  showVictoryModal,
  closeAllGameModals
} from '../ui/modals.js';
import {
  executePlayerRoll,
  evaluateTileLanding,
  hopPlayerSteps3D,
  advanceTurn,
  cancelAllGameTimers,
  startNewMatch,
  executeWorldTourFlight
} from './engine.js';
import { fireConfettiBurst, spawnAnimatedReaction } from '../three/effects.js';
import { saveCurrentMatchToStorage } from './persistence.js';

let activeTab = 'dice';
let panelVisible = false;

/* ─────────────────────────────────────────────────────────────────────────────
   A. INITIALIZATION & CONSOLE API BINDING
───────────────────────────────────────────────────────────────────────────── */

export function initDebugSuite() {
  injectDebugUI();
  bindDebugKeyboardShortcuts();
  populateDropdownOptions();
  syncDebugUIState();

  // Expose handy console API
  window.debug = {
    help: printDebugHelp,
    roll: (d1, d2, pIdx = null) => debugRoll(d1, d2, pIdx),
    teleport: (tileId, triggerLanding = true, pIdx = null) => debugTeleport(pIdx ?? gameState.currentPlayerIdx, tileId, triggerLanding),
    hop: (tileId, pIdx = null) => debugTeleport(pIdx ?? gameState.currentPlayerIdx, tileId, true, true),
    buy: (tileId, pIdx = null, level = 0, charge = false) => {
      debugSetPropertyOwner(tileId, pIdx ?? gameState.currentPlayerIdx, charge);
      if (level > 0) debugSetPropertyLevel(tileId, level);
    },
    level: (tileId, level) => debugSetPropertyLevel(tileId, level),
    mortgage: (tileId) => debugTogglePropertyMortgage(tileId),
    monopoly: (groupKey, pIdx = null, level = 0) => debugGrantMonopoly(groupKey, pIdx ?? gameState.currentPlayerIdx, level),
    cash: (pIdx, amt) => debugSetCash(pIdx, amt),
    addCash: (pIdx, delta) => debugAdjustCash(pIdx, delta),
    jail: (pIdx = null) => debugToggleIsland(pIdx ?? gameState.currentPlayerIdx, true),
    freeJail: (pIdx = null) => debugToggleIsland(pIdx ?? gameState.currentPlayerIdx, false),
    forceTurn: (pIdx) => debugForceTurn(pIdx),
    nextTurn: () => debugAdvanceTurn(),
    freezeAI: (val) => debugToggleFreezeAI(val),
    stepAI: () => debugStepAI(),
    chance: (prizeIdx = null, pIdx = null) => debugTriggerChancePrize(prizeIdx, pIdx ?? gameState.currentPlayerIdx),
    festivalWin: (pIdx = null) => debugTriggerFestivalJackpot(pIdx ?? gameState.currentPlayerIdx),
    victory: (pIdx = null) => debugTriggerVictory(pIdx ?? gameState.currentPlayerIdx),
    scenario: (key) => debugRunScenario(key),
    toggleUI: () => toggleDebugPanel(),
    state: () => ({ gameState, debugState, matchSettings })
  };

  window.WorldTycoonDebug = window.debug;
  window.toggleDebugPanel = toggleDebugPanel;

  console.log(
    '%c🛠️ WORLD TYCOON DEBUG SUITE READY!%c Press %c` (backtick)%c or %cF2%c or click %c[DEBUG]%c, or type %cdebug.help()%c in console.',
    'background:#f59e0b; color:#0f172a; font-weight:bold; padding:4px 8px; border-radius:4px;',
    'color:#94a3b8;',
    'background:#1e293b; color:#38bdf8; font-weight:bold; padding:2px 4px; border-radius:3px;',
    'color:#94a3b8;',
    'background:#1e293b; color:#38bdf8; font-weight:bold; padding:2px 4px; border-radius:3px;',
    'color:#94a3b8;',
    'background:#f59e0b; color:#0f172a; font-weight:bold; padding:2px 4px; border-radius:3px;',
    'color:#94a3b8;',
    'background:#1e293b; color:#4ade80; font-weight:bold; padding:2px 4px; border-radius:3px;',
    'color:#94a3b8;'
  );
}

function printDebugHelp() {
  console.log(`
%c================ WORLD TYCOON DEBUG COMMANDS ================%c
  debug.roll(d1, d2, [playerIdx])      - Roll specific dice (e.g. debug.roll(6, 6))
  debug.teleport(tileId, [trigger])     - Teleport active player to tile 0..31
  debug.hop(tileId, [playerIdx])        - Hop step-by-step to tile
  debug.buy(tileId, [playerIdx], [lvl]) - Buy property & set building level (0..4)
  debug.level(tileId, level)            - Set city level (0=vacant, 1=1house, 2=2houses, 3=hotel, 4=landmark)
  debug.monopoly('brown', [pIdx], [lvl])- Grant full color group monopoly
  debug.cash(playerIdx, amount)         - Set exact cash (e.g. debug.cash(0, 5000000))
  debug.addCash(playerIdx, delta)       - Add/subtract cash (+500000, -200000)
  debug.jail([playerIdx])               - Put player in Island detention
  debug.freeJail([playerIdx])           - Release player from Island
  debug.forceTurn(playerIdx)            - Give active turn to player
  debug.nextTurn()                      - Skip to next turn
  debug.freezeAI(true|false)            - Pause AI autoplay to inspect state
  debug.stepAI()                        - Step AI turn once
  debug.chance([prizeIdx])              - Trigger chance card or open wheel
  debug.festivalWin([playerIdx])        - Win festival jackpot + boost city
  debug.victory([playerIdx])            - Trigger victory celebration
  debug.scenario('rent-squeeze')        - Load preset scenario ('rent-squeeze' | 'island-bail' | 'monopoly-ready' | 'world-tour' | 'festival-jackpot' | 'pass-start')
  debug.toggleUI()                      - Toggle floating debug panel UI
  debug.state()                         - Inspect raw reactive game state
%c=============================================================%c
`, 'color:#f59e0b; font-weight:bold;', '', 'color:#f59e0b; font-weight:bold;', '');
}

/* ─────────────────────────────────────────────────────────────────────────────
   B. KEYBOARD & TOGGLE CONTROLS
───────────────────────────────────────────────────────────────────────────── */

function bindDebugKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ignore keystrokes when typing inside text inputs/textareas
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if (e.key === '`' || e.key === '~' || e.key === 'F2') {
      e.preventDefault();
      toggleDebugPanel();
    }
  });
}

export function toggleDebugPanel(forceOpen = null) {
  const panel = document.getElementById('debug-suite-panel');
  if (!panel) return;

  if (forceOpen !== null) {
    panelVisible = forceOpen;
  } else {
    panelVisible = !panelVisible;
  }

  if (panelVisible) {
    panel.classList.remove('hidden');
    panel.classList.add('flex');
    syncDebugUIState();
  } else {
    panel.classList.add('hidden');
    panel.classList.remove('flex');
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   C. CORE DEBUG ACTIONS
───────────────────────────────────────────────────────────────────────────── */

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
  syncDebugUIState();
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

  syncDebugUIState();
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
    st.mortgaged = false;
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
  syncDebugUIState();
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
  syncDebugUIState();
}

/** Toggle mortgage on a property. */
export function debugTogglePropertyMortgage(tileId, forceState = null) {
  ensureGameStarted();

  tileId = parseInt(tileId, 10);
  const tile = BOARD_TILES[tileId];
  const st = gameState.properties[tileId];
  if (!tile || !st) return;

  st.mortgaged = forceState !== null ? forceState : !st.mortgaged;
  playSFX('cash');
  logEvent(`🏦 <strong>[DEBUG]</strong> <strong>${tile.name}</strong> is now <strong>${st.mortgaged ? 'MORTGAGED' : 'ACTIVE (Unmortgaged)'}</strong>.`);

  refreshTileTextureAndBuildings(tileId);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  syncDebugUIState();
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
  syncDebugUIState();
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
      st.mortgaged = false;
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
  syncDebugUIState();

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
      st.mortgaged = false;
      st.festivalBoost = false;
      refreshTileTextureAndBuildings(t.id);
    }
  });

  logEvent(`🧹 <strong>[DEBUG]</strong> Cleared ownership of group <strong>${GROUP_META[groupKey]?.name || groupKey}</strong>.`);
  renderCornerHUDs();
  saveCurrentMatchToStorage();
  syncDebugUIState();
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
  syncDebugUIState();
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
  syncDebugUIState();
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
  syncDebugUIState();
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
  syncDebugUIState();
}

/** Advance turn to next player immediately. */
export function debugAdvanceTurn() {
  ensureGameStarted();
  cancelAllGameTimers();
  advanceTurn();
  syncDebugUIState();
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
  syncDebugUIState();
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
  syncDebugUIState();
}

/** Trigger Chance Prize directly or open the spinning wheel. */
export async function debugTriggerChancePrize(prizeIdx = null, playerIdx = null) {
  ensureGameStarted();
  playerIdx = playerIdx ?? gameState.currentPlayerIdx;

  if (prizeIdx === null || prizeIdx === '' || prizeIdx === undefined) {
    // Open spinning wheel modal
    openChanceWheelModal(false);
    return;
  }

  prizeIdx = parseInt(prizeIdx, 10);
  const prize = CHANCE_WHEEL_PRIZES[prizeIdx] || CHANCE_WHEEL_PRIZES[0];
  const p = gameState.players[playerIdx];

  logEvent(`🌈 <strong>[DEBUG]</strong> Applying Chance prize to <strong>${p.name}</strong>: <em>${prize.desc}</em>`);

  if (prize.type === 'cash') {
    p.cash += prize.amount;
    playSFX('cash');
    spawnFloatingCashOnHUD(playerIdx, `+${fmtMoney(prize.amount)}`, true);
  } else if (prize.type === 'tax') {
    p.cash -= prize.amount;
    gameState.festivalPot += prize.amount;
    spawnFloatingCashOnHUD(playerIdx, `-${fmtMoney(prize.amount)}`, false);
    checkAndHandleNegativeCash(playerIdx, {
      onRefreshTile: refreshTileTextureAndBuildings,
      onLog: logEvent
    });
  } else if (prize.type === 'island') {
    p.position = 8;
    p.inIsland = true;
    p.islandTurns = 0;
    updatePlayerTokenPositions3D();
  } else if (prize.type === 'move') {
    p.position = prize.target;
    updatePlayerTokenPositions3D();
    await evaluateTileLanding(playerIdx, false);
    return;
  }

  renderCornerHUDs();
  saveCurrentMatchToStorage();
  syncDebugUIState();
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
  syncDebugUIState();
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
  syncDebugUIState();
}

/** Trigger Victory Modal for testing end-of-game celebration. */
export function debugTriggerVictory(playerIdx = null) {
  ensureGameStarted();
  playerIdx = playerIdx ?? gameState.currentPlayerIdx;
  const p = gameState.players[playerIdx] || { id: 0, name: 'Player 1', cash: 5400000, isAI: false };
  showVictoryModal(p);
  syncDebugUIState();
}

/* ─────────────────────────────────────────────────────────────────────────────
   D. PRE-CONFIGURED 1-CLICK TEST SCENARIOS
───────────────────────────────────────────────────────────────────────────── */

export async function debugRunScenario(scenarioKey) {
  ensureGameStarted();
  cancelAllGameTimers();
  closeAllGameModals();

  logEvent(`⚡ <strong>[DEBUG]</strong> Executing Scenario: <strong>${scenarioKey.toUpperCase()}</strong>...`);

  switch (scenarioKey) {
    case 'rent-squeeze': {
      // Player 0 has $60,000 cash
      // Player 1 owns Tokyo (Green, Tile 28) with Level 4 (Landmark) -> rent is $1.9M!
      // Teleport Player 0 directly to Tokyo to test huge rent transfer, asset liquidation, or bankruptcy!
      const p0 = gameState.players[0];
      const p1 = gameState.players[1];
      if (!p0 || !p1) return;

      p0.cash = 60000;
      displayedCash[0] = 60000;

      const tokyoId = 28;
      const st = gameState.properties[tokyoId];
      if (st) {
        st.owner = 1;
        st.level = 4;
        st.mortgaged = false;
        refreshTileTextureAndBuildings(tokyoId);
      }

      debugForceTurn(0);
      showSpeechBubble('Rent Squeeze Scenario: Landing on Tokyo!', 2500);
      await debugTeleport(0, tokyoId, true, false);
      break;
    }

    case 'island-bail': {
      // Detain Player 0 on Tropical Island with $300,000 cash
      // Tests bail button, rolling doubles to escape, or turn counting
      const p0 = gameState.players[0];
      if (!p0) return;

      p0.cash = 300000;
      displayedCash[0] = 300000;
      debugToggleIsland(0, true);
      debugForceTurn(0);
      showSpeechBubble('Island Detention Scenario: Try paying bail or roll doubles!', 2500);
      break;
    }

    case 'monopoly-ready': {
      // Player 0 owns Cairo (Tile 1, Brown)
      // Teleport Player 0 to Tile 2 (Chance)
      // Next roll 1 lands on Mumbai (Tile 3) to trigger the Brown Monopoly buy modal!
      const p0 = gameState.players[0];
      if (!p0) return;

      debugSetPropertyOwner(1, 0, false);
      debugSetPropertyOwner(3, null); // ensure Mumbai is unowned
      p0.cash = 1500000;
      displayedCash[0] = 1500000;

      await debugTeleport(0, 2, false, false);
      debugForceTurn(0);

      // Pre-set forced dice inputs to 0 + 1 so roll button hops 1 step to Mumbai
      setForcedDiceInputs(1, 0);
      showSpeechBubble('Monopoly Ready: Roll 1 to land on Mumbai and complete Brown Monopoly!', 3500);
      break;
    }

    case 'world-tour': {
      // Player 0 on World Tour (Tile 24)
      await debugTeleport(0, 24, true, false);
      showSpeechBubble('World Tour Scenario: Click any tile on the board to fly!', 3000);
      break;
    }

    case 'festival-jackpot': {
      // Put $2,500,000 in Festival pot and land on Festival (Tile 16)
      gameState.festivalPot = 2500000;
      // Also give Player 0 a city so they receive the 2x boost
      debugSetPropertyOwner(1, 0, false);
      await debugTeleport(0, 16, true, false);
      break;
    }

    case 'pass-start': {
      // Player 0 placed at Monaco (Tile 30), forced roll lands on Mumbai (Tile 3)
      // passing START (+300K) intermediate salary!
      const p0 = gameState.players[0];
      if (!p0) return;

      await debugTeleport(0, 30, false, false);
      debugForceTurn(0);
      showSpeechBubble('Passing START: Rolling 5 to cross START and collect 300K!', 2500);
      await debugRoll(2, 3, 0);
      break;
    }

    case 'triple-monopoly-win': {
      debugGrantMonopoly('brown', 0, 1);
      debugGrantMonopoly('lightblue', 0, 1);
      debugGrantMonopoly('pink', 0, 2);
      break;
    }

    case 'line-monopoly-win': {
      [9, 10, 11, 13, 14, 15].forEach(id => {
        debugSetPropertyOwner(id, 0, false);
      });
      const vic = checkVictoryConditions();
      if (vic) showVictoryModal(vic.winner, vic);
      break;
    }

    case 'time-cap-win': {
      debugAdjustCash(0, 5000000);
      matchSettings.matchDurationMinutes = 15;
      const vic = {
        winner: gameState.players[0],
        type: 'net_worth_time',
        title: 'RICHEST TYCOON VICTORY!',
        desc: `Match time limit expired (15m)! Crowned champion with the highest total Net Worth!`
      };
      showVictoryModal(vic.winner, vic);
      break;
    }

    case 'quick-match-2p': {
      startNewMatch();
      break;
    }

    case 'quick-match-4p': {
      matchSettings.customPlayers.forEach((cp, i) => {
        if (i < 4) cp.isAI = (i > 0);
      });
      gameState.players = [];
      startNewMatch();
      break;
    }

    default:
      logEvent(`⚠️ Unknown scenario: ${scenarioKey}`);
  }

  syncDebugUIState();
}

/** Ensure a game match is active, otherwise start one automatically. */
function ensureGameStarted() {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') {
    logEvent(`⚡ [DEBUG] Auto-starting fresh match for testing...`);
    startNewMatch();
  }
}

function setForcedDiceInputs(d1, d2) {
  const sel1 = document.getElementById('debug-d1');
  const sel2 = document.getElementById('debug-d2');
  if (sel1) sel1.value = d1;
  if (sel2) sel2.value = d2;
}

/* ─────────────────────────────────────────────────────────────────────────────
   E. DOM UI INJECTION & SYNCING
───────────────────────────────────────────────────────────────────────────── */

function injectDebugUI() {
  if (document.getElementById('debug-suite-panel')) return;

  // 1. Floating Toggle Button (visible in lobby and in game)
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'debug-floating-toggle-pill';
  toggleBtn.onclick = () => toggleDebugPanel();
  toggleBtn.className = 'fixed bottom-4 left-4 z-50 px-3.5 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 text-amber-400 font-black text-xs shadow-2xl border-2 border-amber-400/80 backdrop-blur-md flex items-center gap-2 transition transform hover:scale-105 active:scale-95 cursor-pointer';
  toggleBtn.title = 'Open Debug Suite [Shortcut: ` (backtick) or F2]';
  toggleBtn.innerHTML = `
    <i class="fa-solid fa-bug text-sm"></i>
    <span>DEBUG</span>
    <span id="debug-ai-badge" class="hidden px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black animate-pulse">AI FROZEN</span>
  `;
  document.body.appendChild(toggleBtn);

  // 2. Main Debug Suite Panel Drawer
  const panel = document.createElement('div');
  panel.id = 'debug-suite-panel';
  panel.className = 'fixed top-12 right-3 z-50 w-[440px] max-w-[96vw] max-h-[88vh] bg-slate-950/95 backdrop-blur-xl border-2 border-slate-700/80 rounded-3xl shadow-2xl text-slate-100 hidden flex-col overflow-hidden select-none font-sans text-xs';

  panel.innerHTML = `
    <!-- HEADER -->
    <div class="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
          <i class="fa-solid fa-wrench"></i>
        </div>
        <div>
          <h2 class="font-black text-sm tracking-wide text-white flex items-center gap-1.5">
            DEBUG SUITE <span class="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">DEV</span>
          </h2>
          <div id="debug-header-subtitle" class="text-[11px] text-slate-400 flex items-center gap-2">
            <span>Turn: P0 (YOU)</span> • <span>Phase: ROLL</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button onclick="window.debug.freezeAI()" id="btn-quick-freeze-ai" class="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] border border-slate-700 flex items-center gap-1" title="Toggle AI Autoplay Pause">
          <i class="fa-solid fa-pause"></i> <span id="quick-freeze-label">Freeze AI</span>
        </button>
        <button onclick="window.toggleDebugPanel(false)" class="w-7 h-7 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>
    </div>

    <!-- TAB NAVIGATION BAR -->
    <div class="flex border-b border-slate-800 bg-slate-900/60 p-1 gap-1 flex-shrink-0 text-slate-400 font-bold">
      <button onclick="window.setDebugTab('dice')" id="debug-tab-btn-dice" class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 bg-indigo-600 text-white shadow">
        <i class="fa-solid fa-dice"></i> <span>Dice</span>
      </button>
      <button onclick="window.setDebugTab('props')" id="debug-tab-btn-props" class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 hover:text-white">
        <i class="fa-solid fa-city"></i> <span>Cities</span>
      </button>
      <button onclick="window.setDebugTab('players')" id="debug-tab-btn-players" class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 hover:text-white">
        <i class="fa-solid fa-users"></i> <span>Players</span>
      </button>
      <button onclick="window.setDebugTab('events')" id="debug-tab-btn-events" class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 hover:text-white">
        <i class="fa-solid fa-wand-magic-sparkles"></i> <span>Events</span>
      </button>
      <button onclick="window.setDebugTab('scenarios')" id="debug-tab-btn-scenarios" class="flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 hover:text-white">
        <i class="fa-solid fa-bolt"></i> <span>Presets</span>
      </button>
    </div>

    <!-- TAB CONTENTS CONTAINER -->
    <div class="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-slate-200">

      <!-- 1. TAB: DICE & MOVEMENT -->
      <div id="debug-tab-content-dice" class="space-y-3">
        <!-- Force Dice Roll -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-dice-d6"></i> Force Exact Dice Roll
            </span>
            <span class="text-[10px] text-slate-400">Applies to Active Player</span>
          </div>

          <div class="flex items-center gap-2">
            <div class="flex-1">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Die 1 (1..6)</label>
              <select id="debug-d1" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-black text-sm">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3" selected>3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
              </select>
            </div>
            <div class="text-slate-500 font-black text-lg pt-4">+</div>
            <div class="flex-1">
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Die 2 (1..6)</label>
              <select id="debug-d2" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-black text-sm">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4" selected>4</option>
                <option value="5">5</option>
                <option value="6">6</option>
              </select>
            </div>
            <div class="pt-4 flex-1">
              <button onclick="window.triggerDebugRollAction()" class="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-dice"></i> ROLL
              </button>
            </div>
          </div>

          <!-- Quick Presets -->
          <div class="space-y-1 pt-1">
            <span class="text-[10px] font-bold text-slate-400">Quick Doubles:</span>
            <div class="grid grid-cols-6 gap-1">
              <button onclick="window.setForcedDice(1, 1)" class="py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 font-bold text-[11px] border border-slate-700">1+1</button>
              <button onclick="window.setForcedDice(2, 2)" class="py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 font-bold text-[11px] border border-slate-700">2+2</button>
              <button onclick="window.setForcedDice(3, 3)" class="py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 font-bold text-[11px] border border-slate-700">3+3</button>
              <button onclick="window.setForcedDice(4, 4)" class="py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 font-bold text-[11px] border border-slate-700">4+4</button>
              <button onclick="window.setForcedDice(5, 5)" class="py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 font-bold text-[11px] border border-slate-700">5+5</button>
              <button onclick="window.setForcedDice(6, 6)" class="py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 font-bold text-[11px] border border-slate-700">6+6</button>
            </div>
          </div>
        </div>

        <!-- Teleport / Position Jump -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <span class="font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-location-crosshairs"></i> Teleport to Board Tile
          </span>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Target Player</label>
              <select id="debug-teleport-player" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-bold"></select>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Destination Tile</label>
              <select id="debug-teleport-tile" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-bold"></select>
            </div>
          </div>

          <div class="flex items-center gap-4 text-slate-300 font-medium">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" id="debug-teleport-eval" checked class="rounded text-indigo-600 focus:ring-0">
              <span class="text-[11px]">Trigger Landing Rules (Rent, Buy, Event, Tax, Jail)</span>
            </label>
          </div>

          <div class="flex gap-2 pt-1">
            <button onclick="window.triggerDebugTeleportAction(false)" class="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs shadow transition active:scale-95 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-bolt"></i> Instant Teleport
            </button>
            <button onclick="window.triggerDebugTeleportAction(true)" class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs border border-slate-700 transition active:scale-95 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-person-walking"></i> Step Hop
            </button>
          </div>
        </div>
      </div>

      <!-- 2. TAB: CITIES & MONOPOLIES -->
      <div id="debug-tab-content-props" class="space-y-3 hidden">
        <!-- Property Inspector & Editor -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-city"></i> City / Resort Inspector
            </span>
            <select id="debug-prop-select" onchange="window.syncSelectedPropertyInfo()" class="bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-white font-bold text-xs"></select>
          </div>

          <!-- Live Card State Pill -->
          <div id="debug-prop-info-badge" class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] grid grid-cols-2 gap-2 text-slate-300">
            <div>Owner: <span id="debug-prop-val-owner" class="font-black text-white">None</span></div>
            <div>Level: <span id="debug-prop-val-level" class="font-black text-white">Vacant (0)</span></div>
            <div>Current Rent: <span id="debug-prop-val-rent" class="font-black text-emerald-400">$0</span></div>
            <div>Status: <span id="debug-prop-val-status" class="font-black text-white">Normal</span></div>
          </div>

          <!-- Assign Ownership -->
          <div class="space-y-1">
            <label class="block text-[10px] font-bold text-slate-400">Assign Ownership</label>
            <div class="flex gap-2">
              <select id="debug-prop-owner-select" class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white font-bold"></select>
              <button onclick="window.triggerDebugSetOwner(false)" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black">
                Assign Free
              </button>
              <button onclick="window.triggerDebugSetOwner(true)" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700" title="Deduct price from player cash">
                Pay Price
              </button>
            </div>
          </div>

          <!-- Set Building Tier -->
          <div class="space-y-1">
            <label class="block text-[10px] font-bold text-slate-400">Set Building Tier (3D Model & Textures)</label>
            <div class="grid grid-cols-5 gap-1 text-[11px]">
              <button onclick="window.triggerDebugSetLevel(0)" class="py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white font-bold border border-slate-700">L0 (Empty)</button>
              <button onclick="window.triggerDebugSetLevel(1)" class="py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white font-bold border border-slate-700">L1 (House)</button>
              <button onclick="window.triggerDebugSetLevel(2)" class="py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white font-bold border border-slate-700">L2 (2 Houses)</button>
              <button onclick="window.triggerDebugSetLevel(3)" class="py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white font-bold border border-slate-700">L3 (Hotel)</button>
              <button onclick="window.triggerDebugSetLevel(4)" class="py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white font-bold border border-slate-700">L4 (Landmark)</button>
            </div>
          </div>

          <!-- Property Action Toggles -->
          <div class="grid grid-cols-3 gap-1.5 pt-1">
            <button onclick="window.triggerDebugToggleMortgage()" class="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1">
              <i class="fa-solid fa-building-columns"></i> Mortgage
            </button>
            <button onclick="window.triggerDebugToggleBoost()" class="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1">
              <i class="fa-solid fa-sparkles text-amber-400"></i> 2× Boost
            </button>
            <button onclick="window.triggerDebugOpenBuyModal()" class="py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-1">
              <i class="fa-solid fa-cart-shopping"></i> Buy Modal
            </button>
          </div>
        </div>

        <!-- Color Group Monopoly Generator -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span class="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-crown"></i> Complete Color Group Monopoly
          </span>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Color Group</label>
              <select id="debug-monopoly-group" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-bold"></select>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Grant To</label>
              <select id="debug-monopoly-player" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-bold"></select>
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <button onclick="window.triggerDebugGrantMonopoly(0)" class="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow flex items-center justify-center gap-1">
              <i class="fa-solid fa-crown"></i> Grant Monopoly
            </button>
            <button onclick="window.triggerDebugGrantMonopoly(3)" class="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow flex items-center justify-center gap-1">
              <i class="fa-solid fa-hotel"></i> With Hotels (L3)
            </button>
            <button onclick="window.triggerDebugClearGroup()" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/80 text-rose-300 font-bold border border-slate-700" title="Reset group to Bank">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 3. TAB: PLAYERS & TURNS -->
      <div id="debug-tab-content-players" class="space-y-3 hidden">
        <!-- Player Selector & Economy Card -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-user"></i> Select Player
            </span>
            <select id="debug-player-select" onchange="window.syncSelectedPlayerInfo()" class="bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-white font-bold text-xs"></select>
          </div>

          <div id="debug-player-info-card" class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] grid grid-cols-2 gap-2 text-slate-300">
            <div>Cash: <span id="debug-player-val-cash" class="font-black text-emerald-400">$0</span></div>
            <div>Tile: <span id="debug-player-val-pos" class="font-black text-white">0 (START)</span></div>
            <div>Island: <span id="debug-player-val-island" class="font-black text-white">No</span></div>
            <div>Type: <span id="debug-player-val-type" class="font-black text-white">Human</span></div>
          </div>

          <!-- Cash Buttons -->
          <div class="space-y-1">
            <label class="block text-[10px] font-bold text-slate-400">Cash Adjustments</label>
            <div class="grid grid-cols-5 gap-1 text-[11px]">
              <button onclick="window.triggerDebugCashDelta(100000)" class="py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-800 text-emerald-300 font-bold border border-emerald-800">+100K</button>
              <button onclick="window.triggerDebugCashDelta(500000)" class="py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-800 text-emerald-300 font-bold border border-emerald-800">+500K</button>
              <button onclick="window.triggerDebugCashDelta(2000000)" class="py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-800 text-emerald-300 font-bold border border-emerald-800">+2.0M</button>
              <button onclick="window.triggerDebugCashDelta(-100000)" class="py-1.5 rounded-lg bg-rose-950 hover:bg-rose-800 text-rose-300 font-bold border border-rose-800">-100K</button>
              <button onclick="window.triggerDebugCashDelta(-500000)" class="py-1.5 rounded-lg bg-rose-950 hover:bg-rose-800 text-rose-300 font-bold border border-rose-800">-500K</button>
            </div>
            <div class="flex gap-2 pt-1">
              <input type="number" id="debug-custom-cash-input" placeholder="Custom amount (e.g. 50000)" class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-white text-xs">
              <button onclick="window.triggerDebugSetCustomCash()" class="px-3 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold">
                Set Exact
              </button>
            </div>
          </div>

          <!-- Status & Detention Controls -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button onclick="window.triggerDebugToggleIsland(true)" class="py-2 rounded-xl bg-amber-950 hover:bg-amber-900 text-amber-300 font-bold border border-amber-800 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-umbrella-beach"></i> Send to Island
            </button>
            <button onclick="window.triggerDebugToggleIsland(false)" class="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-lock-open"></i> Release Island
            </button>
          </div>
        </div>

        <!-- Turn Management & AI Controls -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <span class="font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-forward"></i> Turn & AI Control
          </span>

          <div class="grid grid-cols-2 gap-2">
            <button onclick="window.triggerDebugForceTurn()" class="py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-user-check"></i> Give Active Turn
            </button>
            <button onclick="window.debugAdvanceTurn()" class="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-forward-step"></i> Next Turn
            </button>
          </div>

          <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span class="font-bold text-white block">Freeze AI Autoplay</span>
              <span class="text-[10px] text-slate-400">Prevents AI turns from rushing while debugging</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="debug-chk-freeze-ai" onchange="window.debugToggleFreezeAI(this.checked)" class="sr-only peer">
              <div class="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <button onclick="window.debugStepAI()" class="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-play text-amber-400"></i> Step Single AI Action
          </button>
        </div>
      </div>

      <!-- 4. TAB: EVENTS & MODALS -->
      <div id="debug-tab-content-events" class="space-y-3 hidden">
        <!-- Chance Wheel & Prizes -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span class="font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-dharmachakra"></i> Chance Wheel Events
          </span>
          <label class="block text-[10px] font-bold text-slate-400">Specific Prize Outcome</label>
          <select id="debug-chance-prize-select" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white font-bold"></select>
          <div class="flex gap-2 pt-1">
            <button onclick="window.triggerDebugApplyChancePrize()" class="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-bolt"></i> Apply Prize Now
            </button>
            <button onclick="window.debug.chance()" class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-arrows-spin"></i> Open Wheel Modal
            </button>
          </div>
        </div>

        <!-- Festival & Tax Controls -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span class="font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-landmark"></i> Festival Pot & Tax
          </span>
          <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
            <span>Current Festival Pot:</span>
            <span id="debug-festival-pot-val" class="font-black text-emerald-400 text-sm">$0</span>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <button onclick="window.triggerDebugAdjustPot(250000)" class="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700">+250K Pot</button>
            <button onclick="window.triggerDebugAdjustPot(1000000)" class="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700">+1.0M Pot</button>
            <button onclick="window.triggerDebugAdjustPot(-99999999)" class="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-bold border border-slate-700">Reset Pot</button>
          </div>
          <div class="flex gap-2 pt-1">
            <button onclick="window.debug.festivalWin()" class="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-gift"></i> Claim Jackpot Win
            </button>
            <button onclick="window.triggerDebugTaxLanding()" class="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-receipt"></i> Pay Luxury Tax
            </button>
          </div>
        </div>

        <!-- Interactive Game Modals Direct Triggers -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span class="font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <i class="fa-solid fa-window-restore"></i> Direct Modal Triggers
          </span>
          <div class="grid grid-cols-2 gap-2">
            <button onclick="window.triggerDebugWorldTour()" class="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-plane-departure text-sky-400"></i> World Tour Flight
            </button>
            <button onclick="window.openTradeModal()" class="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-handshake text-emerald-400"></i> Trade Modal
            </button>
            <button onclick="window.triggerDebugAuctionModal()" class="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-gavel text-amber-400"></i> City Auction
            </button>
            <button onclick="window.debug.victory()" class="py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs shadow flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-trophy"></i> Victory Screen
            </button>
          </div>
        </div>
      </div>

      <!-- 5. TAB: QUICK PRESET SCENARIOS -->
      <div id="debug-tab-content-scenarios" class="space-y-2.5 hidden">
        <div class="text-[11px] text-slate-400">
          One-click test environments to reproduce complex Monopoly rules and edge cases instantly:
        </div>

        <!-- Preset 1 -->
        <button onclick="window.debug.scenario('rent-squeeze')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-rose-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-skull"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">Rent Squeeze & Insolvency</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Player 0 has $60K cash and lands on Tokyo (Level 4 Landmark, $1.9M rent owned by Player 1). Tests auto-liquidation & bankruptcy.</div>
          </div>
        </button>

        <!-- Preset 2 -->
        <button onclick="window.debug.scenario('island-bail')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-amber-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-umbrella-beach"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">Island Detention & Bail</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Places player on Island with $300K. Tests bail button ($150K), rolling doubles to escape, and 3-turn max detention.</div>
          </div>
        </button>

        <!-- Preset 3 -->
        <button onclick="window.debug.scenario('monopoly-ready')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-indigo-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-crown"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">1 Roll to Full Monopoly</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Player 0 owns Cairo and sits on Tile 2. Roll 1 to land on Mumbai and complete Brown Monopoly, triggering celebration.</div>
          </div>
        </button>

        <!-- Preset 4 -->
        <button onclick="window.debug.scenario('world-tour')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-sky-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-plane"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">World Tour Flight Mode</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Places player on World Tour (Tile 24) and enables board destination selection flight mode.</div>
          </div>
        </button>

        <!-- Preset 5 -->
        <button onclick="window.debug.scenario('festival-jackpot')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-emerald-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-coins"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">Festival Pot Winner</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Loads $2.5M in Festival Pot and lands on Festival (Tile 16) to claim jackpot and double a city's rent.</div>
          </div>
        </button>

        <!-- Preset 6 -->
        <button onclick="window.debug.scenario('pass-start')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-purple-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-flag-checkered"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">Pass START Salary Collection</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Places player on Monaco and rolls 5 to pass START (collecting $300K salary) before landing.</div>
          </div>
        </button>

        <!-- Preset 7: Triple Monopoly Win -->
        <button onclick="window.debug.scenario('triple-monopoly-win')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-amber-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-crown"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">🏆 Victory: Triple Monopoly (3 Sets)</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Grants Player 0 three complete color sets (Brown, Light Blue, Pink) to trigger instant Triple Monopoly Victory!</div>
          </div>
        </button>

        <!-- Preset 8: Line Monopoly Win -->
        <button onclick="window.debug.scenario('line-monopoly-win')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-sky-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-globe"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">🌐 Victory: Line Monopoly (Entire Side)</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Assigns all cities along an entire edge of the board (Side 2) to Player 0 to trigger Line Monopoly Victory!</div>
          </div>
        </button>

        <!-- Preset 9: Richest Tycoon Time Cap Win -->
        <button onclick="window.debug.scenario('time-cap-win')" class="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-emerald-900/50 flex items-start gap-2.5 text-left transition group">
          <div class="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-sm flex-shrink-0 mt-0.5">
            <i class="fa-solid fa-clock"></i>
          </div>
          <div>
            <div class="font-black text-white group-hover:text-amber-400 transition">⏱️ Victory: Time Limit / Highest Net Worth</div>
            <div class="text-[10px] text-slate-400 mt-0.5">Tests match duration timeout where the wealthiest tycoon by Net Worth is crowned champion!</div>
          </div>
        </button>
      </div>

    </div>

    <!-- FOOTER STATUS BAR -->
    <div class="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 flex-shrink-0">
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>Debug Engine Active</span>
      </div>
      <div>
        Press <span class="text-amber-400 font-bold font-mono">&#96;</span> or <span class="text-amber-400 font-bold font-mono">F2</span> to toggle
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Set default tab
  window.setDebugTab('dice');
}

/* ─────────────────────────────────────────────────────────────────────────────
   F. TAB SWITCHING & DROPDOWN POPULATION
───────────────────────────────────────────────────────────────────────────── */

window.setDebugTab = function(tabName) {
  activeTab = tabName;
  const tabs = ['dice', 'props', 'players', 'events', 'scenarios'];

  tabs.forEach(t => {
    const btn = document.getElementById(`debug-tab-btn-${t}`);
    const content = document.getElementById(`debug-tab-content-${t}`);
    if (t === tabName) {
      if (btn) {
        btn.className = 'flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 bg-indigo-600 text-white shadow font-bold';
      }
      if (content) content.classList.remove('hidden');
    } else {
      if (btn) {
        btn.className = 'flex-1 py-1.5 rounded-lg text-center transition flex items-center justify-center gap-1 hover:text-white font-bold text-slate-400';
      }
      if (content) content.classList.add('hidden');
    }
  });

  syncDebugUIState();
};

function populateDropdownOptions() {
  // 1. All 32 Tiles Dropdown
  const tileSelect = document.getElementById('debug-teleport-tile');
  if (tileSelect) {
    tileSelect.innerHTML = '';
    BOARD_TILES.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      const grp = t.group ? `[${t.group.toUpperCase()}] ` : '';
      const typ = t.type ? `(${t.type.toUpperCase()})` : '';
      opt.textContent = `[${t.id}] ${grp}${t.name} ${typ}`;
      tileSelect.appendChild(opt);
    });
  }

  // 2. Purchasable Properties (Cities & Resorts) Dropdown
  const propSelect = document.getElementById('debug-prop-select');
  if (propSelect) {
    propSelect.innerHTML = '';
    BOARD_TILES.filter(t => t.type === 'city' || t.type === 'resort').forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      const grp = t.group ? `[${t.group.toUpperCase()}] ` : '[RESORT] ';
      opt.textContent = `${grp}${t.name} (${fmtMoney(t.price)})`;
      propSelect.appendChild(opt);
    });
  }

  // 3. Color Groups Dropdown
  const groupSelect = document.getElementById('debug-monopoly-group');
  if (groupSelect) {
    groupSelect.innerHTML = '';
    Object.keys(GROUP_META).forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = `${GROUP_META[k].name} (${k.toUpperCase()})`;
      groupSelect.appendChild(opt);
    });
  }

  // 4. Chance Prizes Dropdown
  const chanceSelect = document.getElementById('debug-chance-prize-select');
  if (chanceSelect) {
    chanceSelect.innerHTML = '';
    CHANCE_WHEEL_PRIZES.forEach((p, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${p.label} - ${p.desc}`;
      chanceSelect.appendChild(opt);
    });
  }

  populatePlayerDropdowns();
}

function populatePlayerDropdowns() {
  const pCount = (gameState.players && gameState.players.length > 0) ? gameState.players.length : 4;
  const dropdownIds = ['debug-teleport-player', 'debug-prop-owner-select', 'debug-monopoly-player', 'debug-player-select'];

  dropdownIds.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const curVal = sel.value;
    sel.innerHTML = '';

    if (id === 'debug-prop-owner-select') {
      const bankOpt = document.createElement('option');
      bankOpt.value = '-1';
      bankOpt.textContent = 'None / Bank';
      sel.appendChild(bankOpt);
    }

    for (let i = 0; i < pCount; i++) {
      const p = gameState.players[i] || { name: `Player ${i + 1}`, isAI: (i > 0) };
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `P${i}: ${p.name} ${p.isAI ? '(AI)' : '(YOU)'}`;
      sel.appendChild(opt);
    }

    if (curVal !== '' && curVal !== null) {
      sel.value = curVal;
    }
  });
}

function syncDebugUIState() {
  populatePlayerDropdowns();

  // Header Subtitle
  const sub = document.getElementById('debug-header-subtitle');
  if (sub && gameState.players) {
    const currP = gameState.players[gameState.currentPlayerIdx] || { name: 'Player 0', isAI: false };
    const freezeTag = debugState.freezeAI ? '<span class="text-rose-400 font-black">AI FROZEN</span>' : 'AI Active';
    sub.innerHTML = `<span>Turn: <strong>P${gameState.currentPlayerIdx} (${currP.name})</strong></span> • <span>Phase: <strong>${gameState.phase}</strong></span> • <span>${freezeTag}</span>`;
  }

  // Quick freeze button label
  const freezeLabel = document.getElementById('quick-freeze-label');
  if (freezeLabel) {
    freezeLabel.textContent = debugState.freezeAI ? 'Resume AI' : 'Freeze AI';
  }
  const freezeChk = document.getElementById('debug-chk-freeze-ai');
  if (freezeChk) {
    freezeChk.checked = debugState.freezeAI;
  }
  const aiBadge = document.getElementById('debug-ai-badge');
  if (aiBadge) {
    if (debugState.freezeAI) aiBadge.classList.remove('hidden');
    else aiBadge.classList.add('hidden');
  }

  // Sync Selected Property Info
  window.syncSelectedPropertyInfo();

  // Sync Selected Player Info
  window.syncSelectedPlayerInfo();

  // Sync Festival Pot
  const potVal = document.getElementById('debug-festival-pot-val');
  if (potVal) {
    potVal.textContent = fmtMoney(gameState.festivalPot || 0);
  }
}

window.syncSelectedPropertyInfo = function() {
  const propSelect = document.getElementById('debug-prop-select');
  if (!propSelect) return;
  const tileId = parseInt(propSelect.value, 10);
  const tile = BOARD_TILES[tileId];
  if (!tile) return;
  const st = gameState.properties[tileId] || { owner: null, level: 0, mortgaged: false, festivalBoost: false };

  const ownerEl = document.getElementById('debug-prop-val-owner');
  const levelEl = document.getElementById('debug-prop-val-level');
  const rentEl = document.getElementById('debug-prop-val-rent');
  const statusEl = document.getElementById('debug-prop-val-status');

  if (ownerEl) {
    if (st.owner !== null && gameState.players[st.owner]) {
      ownerEl.textContent = `P${st.owner} (${gameState.players[st.owner].name})`;
      ownerEl.className = 'font-black text-amber-400';
    } else {
      ownerEl.textContent = 'Bank (Unowned)';
      ownerEl.className = 'font-black text-slate-400';
    }
  }

  const tierNames = ['Vacant (0)', '1 House (1)', '2 Houses (2)', 'Hotel (3)', 'Landmark (4)'];
  if (levelEl) levelEl.textContent = tierNames[st.level || 0];
  if (rentEl) rentEl.textContent = fmtMoney(calculateTileRent(tileId));

  if (statusEl) {
    const statuses = [];
    if (st.mortgaged) statuses.push('MORTGAGED');
    if (st.festivalBoost) statuses.push('2× BOOSTED');
    statusEl.textContent = statuses.length > 0 ? statuses.join(' • ') : 'Normal';
    statusEl.className = st.mortgaged ? 'font-black text-rose-400' : 'font-black text-emerald-400';
  }
};

window.syncSelectedPlayerInfo = function() {
  const playerSelect = document.getElementById('debug-player-select');
  if (!playerSelect) return;
  const pIdx = parseInt(playerSelect.value, 10) || 0;
  const p = gameState.players[pIdx];
  if (!p) return;

  const cashEl = document.getElementById('debug-player-val-cash');
  const posEl = document.getElementById('debug-player-val-pos');
  const islandEl = document.getElementById('debug-player-val-island');
  const typeEl = document.getElementById('debug-player-val-type');

  if (cashEl) cashEl.textContent = fmtMoney(p.cash);
  if (posEl) posEl.textContent = `${p.position} (${BOARD_TILES[p.position]?.name || 'Tile'})`;
  if (islandEl) islandEl.textContent = p.inIsland ? `YES (${p.islandTurns}/3 turns)` : 'No';
  if (typeEl) typeEl.textContent = p.bankrupt ? 'BANKRUPT' : (p.isAI ? 'AI Player' : 'Human Player');
};

/* ─────────────────────────────────────────────────────────────────────────────
   G. WINDOW EVENT HANDLERS FOR HTML BUTTONS
───────────────────────────────────────────────────────────────────────────── */

window.setForcedDice = function(d1, d2) {
  setForcedDiceInputs(d1, d2);
  debugRoll(d1, d2);
};

window.triggerDebugRollAction = function() {
  const d1 = parseInt(document.getElementById('debug-d1')?.value, 10) || 3;
  const d2 = parseInt(document.getElementById('debug-d2')?.value, 10) || 4;
  debugRoll(d1, d2);
};

window.triggerDebugTeleportAction = function(hopAnimate = false) {
  const pIdx = parseInt(document.getElementById('debug-teleport-player')?.value, 10) || 0;
  const tileId = parseInt(document.getElementById('debug-teleport-tile')?.value, 10) || 0;
  const evalLanding = document.getElementById('debug-teleport-eval')?.checked ?? true;
  debugTeleport(pIdx, tileId, evalLanding, hopAnimate);
};

window.triggerDebugSetOwner = function(chargePrice) {
  const tileId = parseInt(document.getElementById('debug-prop-select')?.value, 10);
  const pIdx = parseInt(document.getElementById('debug-prop-owner-select')?.value, 10);
  debugSetPropertyOwner(tileId, pIdx < 0 ? null : pIdx, chargePrice);
};

window.triggerDebugSetLevel = function(level) {
  const tileId = parseInt(document.getElementById('debug-prop-select')?.value, 10);
  debugSetPropertyLevel(tileId, level);
};

window.triggerDebugToggleMortgage = function() {
  const tileId = parseInt(document.getElementById('debug-prop-select')?.value, 10);
  debugTogglePropertyMortgage(tileId);
};

window.triggerDebugToggleBoost = function() {
  const tileId = parseInt(document.getElementById('debug-prop-select')?.value, 10);
  debugToggleFestivalBoost(tileId);
};

window.triggerDebugOpenBuyModal = function() {
  const tileId = parseInt(document.getElementById('debug-prop-select')?.value, 10);
  const tile = BOARD_TILES[tileId];
  if (tile) openBuyCityModal(tile, false);
};

window.triggerDebugGrantMonopoly = function(level = 0) {
  const group = document.getElementById('debug-monopoly-group')?.value || 'brown';
  const pIdx = parseInt(document.getElementById('debug-monopoly-player')?.value, 10) || 0;
  debugGrantMonopoly(group, pIdx, level);
};

window.triggerDebugClearGroup = function() {
  const group = document.getElementById('debug-monopoly-group')?.value || 'brown';
  debugClearGroup(group);
};

window.triggerDebugCashDelta = function(delta) {
  const pIdx = parseInt(document.getElementById('debug-player-select')?.value, 10) || 0;
  debugAdjustCash(pIdx, delta);
};

window.triggerDebugSetCustomCash = function() {
  const pIdx = parseInt(document.getElementById('debug-player-select')?.value, 10) || 0;
  const val = parseInt(document.getElementById('debug-custom-cash-input')?.value, 10);
  if (!isNaN(val)) debugSetCash(pIdx, val);
};

window.triggerDebugToggleIsland = function(force) {
  const pIdx = parseInt(document.getElementById('debug-player-select')?.value, 10) || 0;
  debugToggleIsland(pIdx, force);
};

window.triggerDebugForceTurn = function() {
  const pIdx = parseInt(document.getElementById('debug-player-select')?.value, 10) || 0;
  debugForceTurn(pIdx);
};

window.triggerDebugApplyChancePrize = function() {
  const prizeIdx = parseInt(document.getElementById('debug-chance-prize-select')?.value, 10) || 0;
  debugTriggerChancePrize(prizeIdx);
};

window.triggerDebugAdjustPot = function(delta) {
  debugAdjustFestivalPot(delta);
};

window.triggerDebugTaxLanding = function() {
  debugTeleport(gameState.currentPlayerIdx, 29, true, false);
};

window.triggerDebugWorldTour = function() {
  debugTeleport(gameState.currentPlayerIdx, 24, true, false);
};

window.triggerDebugAuctionModal = function() {
  const tileId = parseInt(document.getElementById('debug-prop-select')?.value, 10) || 1;
  startCityAuction(tileId);
};
