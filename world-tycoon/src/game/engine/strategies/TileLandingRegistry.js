/**
 * game/engine/strategies/TileLandingRegistry.js
 * Registry mapping tile types to dedicated landing strategies.
 * Implements Open/Closed Principle (OCP): open to new tile types without modifying core engine.
 */

import { PropertyLandingStrategy } from './PropertyLandingStrategy.js';
import { TaxLandingStrategy } from './TaxLandingStrategy.js';
import { ChanceLandingStrategy } from './ChanceLandingStrategy.js';
import { IslandLandingStrategy } from './IslandLandingStrategy.js';
import { FestivalLandingStrategy } from './FestivalLandingStrategy.js';
import { AirportLandingStrategy } from './AirportLandingStrategy.js';
import { StartLandingStrategy } from './StartLandingStrategy.js';

export class TileLandingRegistry {
  constructor(tileLandingEvaluator) {
    /** @type {Map<string, import('./ITileLandingStrategy.js').ITileLandingStrategy>} */
    this.strategies = new Map();

    const propertyStrategy = new PropertyLandingStrategy();
    this.register('city', propertyStrategy);
    this.register('resort', propertyStrategy);
    this.register('tax', new TaxLandingStrategy());
    this.register('chance', new ChanceLandingStrategy());
    this.register('island', new IslandLandingStrategy());
    this.register('festival', new FestivalLandingStrategy());
    this.register('start', new StartLandingStrategy());
    this.register('worldtour', new AirportLandingStrategy(tileLandingEvaluator));
  }

  /**
   * Registers a new tile landing strategy.
   * Enables seamless addition of new tile types without touching existing code.
   * @param {string} tileType
   * @param {import('./ITileLandingStrategy.js').ITileLandingStrategy} strategy
   */
  register(tileType, strategy) {
    this.strategies.set(tileType, strategy);
  }

  /**
   * Resolves the strategy for the given tile type.
   * @param {string} tileType
   * @returns {import('./ITileLandingStrategy.js').ITileLandingStrategy | null}
   */
  resolve(tileType) {
    return this.strategies.get(tileType) || null;
  }
}
