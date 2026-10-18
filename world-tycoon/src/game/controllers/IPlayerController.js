/**
 * game/controllers/IPlayerController.js
 * Player Controller Interface / Base Class.
 * Adheres to Liskov Substitution Principle (LSP) and Single Responsibility Principle (SRP).
 * Allows game turn cycles to execute uniformly whether a player is Human, AI bot, or Remote peer.
 */

export class IPlayerController {
  /**
   * @param {number} playerIndex
   * @param {import('../../types/game.d.ts').PlayerGameState} playerState
   */
  constructor(playerIndex, playerState) {
    this.playerIndex = playerIndex;
    this.playerState = playerState;
  }

  /**
   * Returns true if this controller is controlled by a local human.
   * @returns {boolean}
   */
  isLocalHuman() {
    return false;
  }

  /**
   * Returns true if this controller is an automated AI agent.
   * @returns {boolean}
   */
  isAI() {
    return false;
  }

  /**
   * Returns true if this controller is a remote network peer.
   * @returns {boolean}
   */
  isRemote() {
    return false;
  }

  /**
   * Called when it is this player's turn to roll the dice.
   * @param {Object} context
   * @returns {Promise<void>}
   */
  async onTurnStart(context) {
    // Override in concrete controller
  }
}
