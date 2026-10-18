/**
 * game/controllers/PlayerControllerFactory.js
 * Factory for creating polymorphic IPlayerController instances.
 * Implements Open/Closed Principle (OCP) and Dependency Inversion (DIP).
 */

import { gameState, localPlayerIdx } from '../state.js';
import { networkState } from '../../network/p2p.js';
import { HumanPlayerController } from './HumanPlayerController.js';
import { AIPlayerController } from './AIPlayerController.js';
import { RemotePlayerController } from './RemotePlayerController.js';

export class PlayerControllerFactory {
  /**
   * Creates the appropriate controller for the given player slot.
   * @param {number} playerIndex
   * @returns {import('./IPlayerController.js').IPlayerController}
   */
  static create(playerIndex) {
    const player = gameState.players ? gameState.players[playerIndex] : null;
    if (!player) {
      throw new Error(`[PlayerControllerFactory] Invalid player index: ${playerIndex}`);
    }

    if (player.isAI) {
      return new AIPlayerController(playerIndex, player);
    }

    const mySlot = networkState.isMultiplayer ? networkState.localPlayerIdx : (localPlayerIdx || 0);
    const isLocalHuman = (playerIndex === mySlot);

    if (isLocalHuman) {
      return new HumanPlayerController(playerIndex, player);
    }

    return new RemotePlayerController(playerIndex, player);
  }
}
