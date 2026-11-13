/**
 * ui/setup/matchSettingsUI.js
 * Match settings buttons: Starting Cash, Turn Timer, Duration, Atmosphere, Board Styles & Editions, and Color Swatches.
 */

import { matchSettings, lobbyPlayerCount } from '../../game/state.js';
import { applyBoardEdition } from '../../game/data.js';
import { playSFX } from '../../game/audio.js';
import { applyLightingMode } from '../../three/effects.js';
import { getSceneLighting, applyBoardStyle, refreshAllTileTexturesAndMaterials } from '../../three/scene.js';
import { networkState, broadcastLobbySettings, broadcastAction } from '../../network/p2p.js';
import { CANDY_PALETTE, canCurrentPlayerChangeColor, selectedSetupPlayerIdx } from './playerCustomization.js';
import { updateLobbyStore } from '../../svelte/stores/lobbyStore.js';

const MATCH_DURATION_OPTIONS = [15, 30, 45, 60, 75];

export function setStartingCash(amt) {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  matchSettings.startingCash = amt;
  renderMatchSettingButtons();
  playSFX('hop');
  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastLobbySettings();
  }
}

export function stepDecisionTime(delta) {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  const cur = matchSettings.turnDuration || 20;
  matchSettings.turnDuration = Math.max(10, Math.min(60, cur + delta * 5));
  renderMatchSettingButtons();
  playSFX('hop');
  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastLobbySettings();
  }
}

export function stepMatchDuration(delta) {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  const cur = matchSettings.matchDurationMinutes || 15;
  const idx = MATCH_DURATION_OPTIONS.indexOf(cur);
  const nextIdx = Math.max(0, Math.min(MATCH_DURATION_OPTIONS.length - 1, (idx === -1 ? 0 : idx) + delta));
  matchSettings.matchDurationMinutes = MATCH_DURATION_OPTIONS[nextIdx];
  renderMatchSettingButtons();
  playSFX('hop');
  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastLobbySettings();
  }
}

export function stepAtmosphere(delta) {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  if (matchSettings.boardStyle === 'cyberpunk') return; // Sunset and Night are removed from Cyber
  const modes = ['day', 'sunset', 'night'];
  const curIdx = modes.indexOf(matchSettings.lightingTheme || 'day');
  const nextIdx = (curIdx + delta + modes.length) % modes.length;
  setAtmosphereMode(modes[nextIdx]);
}

export const stepMatchLength = stepAtmosphere;

export function setTurnTimerDuration(sec) {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  matchSettings.turnDuration = sec;
  renderMatchSettingButtons();
  playSFX('hop');
  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastLobbySettings();
  }
}

export function setAtmosphereMode(mode) {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  if (matchSettings.boardStyle === 'cyberpunk') {
    mode = 'day';
  }
  matchSettings.lightingTheme = mode;
  applyLightingMode(mode, getSceneLighting());
  renderMatchSettingButtons();
  playSFX('hop');
  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastLobbySettings();
  }
}

export function setBoardStyle(style) {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  if (['wood', 'cyberpunk', 'elegant'].includes(style)) {
    matchSettings.boardStyle = style;
    if (style === 'cyberpunk') {
      matchSettings.lightingTheme = 'day';
    }
    applyBoardStyle(style);
    renderMatchSettingButtons();
    playSFX('hop');
    if (networkState.isMultiplayer && networkState.isHost) {
      broadcastLobbySettings();
    }
  }
}

export function cycleBoardStyle() {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  const styles = ['wood', 'cyberpunk', 'elegant'];
  const curIdx = styles.indexOf(matchSettings.boardStyle || 'wood');
  const nextStyle = styles[(curIdx + 1) % styles.length];
  setBoardStyle(nextStyle);
}

export function setBoardEdition(edition) {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  if (['world', 'rajasthan'].includes(edition)) {
    matchSettings.boardEdition = edition;
    applyBoardEdition(edition);
    refreshAllTileTexturesAndMaterials();
    renderMatchSettingButtons();
    playSFX('hop');
    if (networkState.isMultiplayer && networkState.isHost) {
      broadcastLobbySettings();
      broadcastAction('ACTION_SYNC_BOARD_EDITION', { boardEdition: edition });
    }
  }
}

export function cycleBoardEdition() {
  if (networkState.isMultiplayer && !networkState.isHost) return;
  const editions = ['world', 'rajasthan'];
  const curIdx = editions.indexOf(matchSettings.boardEdition || 'world');
  const nextEdition = editions[(curIdx + 1) % editions.length];
  setBoardEdition(nextEdition);
}

export function renderMatchSettingButtons() {
  const isGuest = networkState.isMultiplayer && !networkState.isHost;
  const isCyber = (matchSettings.boardStyle === 'cyberpunk');
  const curAtmo = matchSettings.lightingTheme || 'day';

  // HUD Board Style & Edition fallback labels
  const hudBoardText = document.getElementById('btn-board-style-text');
  if (hudBoardText) {
    const style = matchSettings.boardStyle || 'wood';
    hudBoardText.textContent = style === 'cyberpunk' ? 'Cyber' : (style === 'elegant' ? 'Elegant' : 'Wood');
  }

  const hudEditionText = document.getElementById('btn-board-edition-text');
  if (hudEditionText) {
    hudEditionText.textContent = (matchSettings.boardEdition === 'rajasthan') ? 'Rajasthan' : 'World';
  }

  // Reactive Svelte 5 Lobby Store synchronization
  updateLobbyStore({
    startingCash: matchSettings.startingCash || 2000000,
    decisionTime: matchSettings.turnDuration || 20,
    matchDuration: matchSettings.matchDurationMinutes || 15,
    boardEdition: matchSettings.boardEdition || 'world',
    boardStyle: matchSettings.boardStyle || 'wood',
    lightingTheme: curAtmo,
    atmosphereDesc: (curAtmo === 'night') ? 'Night' : ((curAtmo === 'sunset') ? 'Sunset' : 'Morning'),
    isMultiplayer: Boolean(networkState.isMultiplayer),
    isHost: !isGuest
  });

  // Color Swatches - reflects the player currently selected on the podium
  const colorContainer = document.getElementById('setup-color-swatches');
  if (colorContainer) {
    const curIdx = (selectedSetupPlayerIdx < lobbyPlayerCount) ? selectedSetupPlayerIdx : 0;
    const curPlayer = matchSettings.customPlayers[curIdx];
    const curHex = (curPlayer?.colorHex || '#3b82f6').toLowerCase();
    const canEditColor = canCurrentPlayerChangeColor(curIdx);

    colorContainer.innerHTML = CANDY_PALETTE.map(c => {
      const cHex = c.hex.toLowerCase();
      const isSelected = (curHex === cHex);
      // A color is ONLY considered taken and locked if another HUMAN player in the game has it!
      const otherHumanOwner = matchSettings.customPlayers.find((p, idx) => 
        idx !== curIdx && idx < lobbyPlayerCount && !p.isAI && (p.colorHex || '').toLowerCase() === cHex
      );
      const isTaken = Boolean(otherHumanOwner);

      if (isTaken) {
        return `
          <button type="button" disabled aria-disabled="true" class="color-swatch-btn swatch-disabled" style="background:${c.hex}" title="${c.name} (Taken by ${otherHumanOwner.name})" aria-label="${c.name} - Taken by ${otherHumanOwner.name}">
            <i class="fa-solid fa-lock text-[9px] text-white/90 drop-shadow"></i>
          </button>
        `;
      }

      if (isSelected) {
        return `
          <button type="button" aria-selected="true" class="color-swatch-btn swatch-selected" style="background:${c.hex}" title="${c.name} (Selected by ${curPlayer?.name || 'You'})" aria-label="${c.name} (Selected)">
            <i class="fa-solid fa-check text-white text-xs drop-shadow"></i>
          </button>
        `;
      }

      if (!canEditColor) {
        return `
          <button type="button" disabled class="color-swatch-btn opacity-40 cursor-not-allowed" style="background:${c.hex}" title="Select your own player to edit color">
          </button>
        `;
      }

      return `
        <button type="button" onclick="window.setLocalPlayerColor('${c.hex}', ${c.charColor})" class="color-swatch-btn" style="background:${c.hex}" title="Choose ${c.name}" aria-label="Choose ${c.name}">
        </button>
      `;
    }).join('');
  }
}
