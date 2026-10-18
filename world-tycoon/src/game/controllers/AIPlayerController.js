/**
 * game/controllers/AIPlayerController.js
 * Controller for autonomous AI tycoon bots.
 * Manages decision-making heuristics and scheduled rolls.
 * Implements Liskov Substitution Principle (LSP).
 */

import { IPlayerController } from './IPlayerController.js';
import { gameState, debugState, matchSettings, localPlayerIdx } from '../state.js';
import { setStatusPill, logEvent, updateRollButtonsUI } from '../../ui/hud.js';
import { showSpeechBubble } from '../../three/scene.js';
import { generateProactiveBotTrade } from '../trading.js';
import { showIncomingTradeOfferModal } from '../../ui/modals.js';
import { networkState } from '../../network/p2p.js';

function getGameDelay(ms) {
  const speed = matchSettings.gameSpeed || 1;
  return Math.max(30, Math.round(ms / speed));
}

let currentAITimer = null;

export class AIPlayerController extends IPlayerController {
  isAI() {
    return true;
  }

  static cancelTimer() {
    if (currentAITimer) {
      clearTimeout(currentAITimer);
      currentAITimer = null;
    }
  }

  async onTurnStart({ executeRollFn }) {
    updateRollButtonsUI(false);
    const p = this.playerState;

    if (p.inIsland) {
      setStatusPill(`🤔 <strong>${p.name}</strong> is rolling for doubles to leave the Island...`, {
        isThinking: true,
        playerIdx: this.playerIndex
      });
    } else {
      setStatusPill(`🤔 <strong>${p.name}</strong> is rolling the dice...`, {
        isThinking: true,
        playerIdx: this.playerIndex
      });
    }

    showSpeechBubble(`${p.name}'s Turn!`, 1800);

    if (networkState.isMultiplayer && !networkState.isHost) {
      // In P2P multiplayer, only Host executes AI logic
      return;
    }

    if (debugState?.freezeAI) {
      logEvent(`⏸️ <strong>[DEBUG]</strong> AI roll paused for <strong>${p.name}</strong> (AI Frozen).`);
      return;
    }

    // Check proactive bot trade offer to local player
    const humanIdx = localPlayerIdx || 0;
    const botTrade = generateProactiveBotTrade(this.playerIndex);
    if (botTrade && botTrade.targetIdx === humanIdx && !gameState.players[humanIdx]?.bankrupt) {
      showIncomingTradeOfferModal(botTrade);
    }

    AIPlayerController.cancelTimer();
    currentAITimer = setTimeout(() => {
      currentAITimer = null;
      if (!gameState.gameStarted || gameState.phase === 'SETUP' || gameState.phase === 'VICTORY') return;
      if (typeof executeRollFn === 'function') {
        executeRollFn();
      }
    }, getGameDelay(350));
  }
}
