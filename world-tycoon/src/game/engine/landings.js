/**
 * game/engine/landings.js
 * Board tile landing orchestrator.
 * Refactored using SOLID Principles:
 * - Single Responsibility Principle (SRP): Coordinates landing evaluation without coupling to low-level UI/3D logic.
 * - Open/Closed Principle (OCP): Delegated to Strategy Registry; open for new tile types without modification.
 * - Dependency Inversion Principle (DIP): Depends on ITileLandingStrategy abstractions.
 */

import { BOARD_TILES } from '../data.js';
import { gameState } from '../state.js';
import { TileLandingRegistry } from './strategies/TileLandingRegistry.js';
import { PropertyLandingStrategy } from './strategies/PropertyLandingStrategy.js';

// Instantiate the landing registry with self-reference for flight hops
const landingRegistry = new TileLandingRegistry(evaluateTileLanding);

// Shared instance of PropertyLandingStrategy for legacy exports
const propertyStrategy = new PropertyLandingStrategy();

/**
 * Evaluates the landing of a player on their current board tile.
 * Delegates to the appropriate tile landing strategy.
 * @param {number} playerIdx
 * @param {boolean} isDoubles
 */
export async function evaluateTileLanding(playerIdx, isDoubles) {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') return;
  gameState.upgradesThisVisit = 0;

  const player = gameState.players ? gameState.players[playerIdx] : null;
  if (!player) return;

  const tile = BOARD_TILES[player.position];
  if (!tile) return;

  const strategy = landingRegistry.resolve(tile.type);
  if (!strategy) {
    console.warn(`[TileLanding] No strategy registered for tile type: "${tile.type}"`);
    if (window.concludeActionPhase) {
      window.concludeActionPhase(isDoubles);
    }
    return;
  }

  await strategy.execute({
    playerIdx,
    isDoubles,
    player,
    tile,
    propertyState: gameState.properties[tile.id]
  });
}

// Backward-compatible delegates for any legacy external callers
export function handleAICityDecision(playerIdx, tile, isDoubles) {
  return propertyStrategy.handleAICityDecision(playerIdx, tile, isDoubles);
}

export function handleAIBuyoutDecision(playerIdx, tile, st, buyoutCost, isDoubles) {
  return propertyStrategy.handleAIBuyoutDecision(playerIdx, tile, st, buyoutCost, isDoubles);
}

export function handleAIOwnedCityLanding(playerIdx, tile, isDoubles) {
  return propertyStrategy.handleAIOwnedCityLanding(playerIdx, tile, isDoubles);
}

export { landingRegistry };
