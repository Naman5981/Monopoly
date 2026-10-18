/**
 * game/controllers/HumanPlayerController.js
 * Controller for the active local human player.
 * Enables UI roll buttons, keyboard hotkeys, and status indicators.
 * Implements Liskov Substitution Principle (LSP).
 */

import { IPlayerController } from './IPlayerController.js';
import { updateRollButtonsUI, refreshActivePlayerTurnStatus } from '../../ui/hud.js';
import { showSpeechBubble } from '../../three/scene.js';

export class HumanPlayerController extends IPlayerController {
  isLocalHuman() {
    return true;
  }

  async onTurnStart() {
    updateRollButtonsUI(true);
    refreshActivePlayerTurnStatus();
    showSpeechBubble('Your Turn! Roll or press Space!', 2200);
  }
}
