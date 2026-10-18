/**
 * game/engine/strategies/ITileLandingStrategy.js
 * Contract / Interface for all board tile landing behaviors.
 * Adheres to Open/Closed Principle (OCP) and Single Responsibility Principle (SRP).
 */

/**
 * @typedef {Object} TileLandingContext
 * @property {number} playerIdx
 * @property {boolean} isDoubles
 * @property {import('../../../types/game.d.ts').PlayerGameState} player
 * @property {Object} tile
 * @property {import('../../../types/game.d.ts').PropertyState} [propertyState]
 */

export class ITileLandingStrategy {
  /**
   * Evaluates the landing of a player on a tile.
   * @param {TileLandingContext} context
   * @returns {Promise<void>}
   */
  async execute(context) {
    throw new Error(`Method 'execute' must be implemented by concrete landing strategy for tile type: ${context?.tile?.type}`);
  }
}
