/**
 * game/debug/scenarios.js
 * Pre-configured 1-click test scenarios for QA and rapid feature testing.
 */

import { gameState, displayedCash, matchSettings } from '../state.js';
import { logEvent } from '../../ui/hud.js';
import { refreshTileTextureAndBuildings, showSpeechBubble } from '../../three/scene.js';
import { cancelAllGameTimers, startNewMatch } from '../engine.js';
import { closeAllGameModals, showVictoryModal } from '../../ui/modals.js';
import { checkVictoryConditions } from '../rules.js';
import {
  ensureGameStarted,
  debugForceTurn,
  debugTeleport,
  debugRoll,
  debugToggleIsland,
  debugSetPropertyOwner,
  debugGrantMonopoly,
  debugAdjustCash
} from './actions.js';

function setForcedDiceInputs(d1, d2) {
  const sel1 = document.getElementById('debug-d1');
  const sel2 = document.getElementById('debug-d2');
  if (sel1) sel1.value = d1;
  if (sel2) sel2.value = d2;
}

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

  if (window.syncDebugUIState) window.syncDebugUIState();
}
