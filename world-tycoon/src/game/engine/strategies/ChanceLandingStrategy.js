/**
 * game/engine/strategies/ChanceLandingStrategy.js
 * Strategy for landing on Chance Fortune Wheel tile.
 */

import { ITileLandingStrategy } from './ITileLandingStrategy.js';
import { openChanceWheelModal } from '../../../ui/modals.js';

export class ChanceLandingStrategy extends ITileLandingStrategy {
  async execute(context) {
    const { playerIdx, isDoubles } = context;
    openChanceWheelModal(isDoubles, playerIdx);
  }
}
