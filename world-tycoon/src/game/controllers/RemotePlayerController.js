/**
 * game/controllers/RemotePlayerController.js
 * Controller for online peer players connected via WebRTC P2P DataChannels.
 * Implements Liskov Substitution Principle (LSP).
 */

import { IPlayerController } from './IPlayerController.js';
import { updateRollButtonsUI, setStatusPill } from '../../ui/hud.js';
import { showSpeechBubble } from '../../three/scene.js';

export class RemotePlayerController extends IPlayerController {
  isRemote() {
    return true;
  }

  async onTurnStart() {
    updateRollButtonsUI(false);
    const p = this.playerState;
    setStatusPill(`⏳ Waiting for <strong>${p.name}</strong>'s move...`, {
      isThinking: true,
      playerIdx: this.playerIndex
    });
    showSpeechBubble(`${p.name}'s Turn!`, 2000);
  }
}
