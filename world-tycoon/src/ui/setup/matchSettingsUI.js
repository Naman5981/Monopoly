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
import { CANDY_PALETTE, canCurrentPlayerEditSlot, canCurrentPlayerChangeColor, selectedSetupPlayerIdx } from './playerCustomization.js';

export const MATCH_DURATION_OPTIONS = [15, 30, 45, 60, 75];

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

  // Visual banner in right column for guests
  const settingsCol = document.getElementById('lobby-settings-column');
  let guestBanner = document.getElementById('lobby-guest-locked-banner');
  if (isGuest) {
    if (!guestBanner && settingsCol) {
      guestBanner = document.createElement('div');
      guestBanner.id = 'lobby-guest-locked-banner';
      guestBanner.className = 'bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-2xl p-3 text-xs font-black flex items-center gap-2.5 shadow-xs mb-1';
      guestBanner.innerHTML = `<i class="fa-solid fa-lock text-amber-600 text-base"></i><div><div class="text-[11px] font-black tracking-wider uppercase text-amber-700">Client Mode</div><div>Room settings controlled by Table Host</div></div>`;
      settingsCol.prepend(guestBanner);
    } else if (guestBanner) {
      guestBanner.classList.remove('hidden');
    }
  } else if (guestBanner) {
    guestBanner.classList.add('hidden');
  }

  // Cash buttons
  [1500000, 2000000, 3000000, 5000000].forEach(amt => {
    const btn = document.getElementById(`setup-cash-${amt}`);
    if (btn) {
      const active = matchSettings.startingCash === amt;
      const lockedClasses = isGuest ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer';
      btn.className = `py-1.5 rounded-lg text-xs font-black transition text-center ${lockedClasses} ${
        active ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
      }`;
    }
  });

  // Decision time text
  const timerTextEl = document.getElementById('setup-decision-time-text');
  if (timerTextEl) {
    timerTextEl.textContent = `${matchSettings.turnDuration || 20} s`;
  }

  // Match Duration text (15 min steps up to 1.25 hr)
  const durationTextEl = document.getElementById('setup-match-duration-text');
  if (durationTextEl) {
    const mins = matchSettings.matchDurationMinutes || 15;
    if (mins >= 60) {
      const hours = (mins / 60).toFixed(2).replace(/\.?0+$/, '');
      durationTextEl.textContent = `${hours} hr (${mins}m)`;
    } else {
      durationTextEl.textContent = `${mins} min`;
    }
  }

  // Match length / atmosphere text
  const isCyber = (matchSettings.boardStyle === 'cyberpunk');
  const atmoTextEl = document.getElementById('setup-atmosphere-text') || document.getElementById('setup-match-length-text');
  if (atmoTextEl) {
    if (isCyber) {
      atmoTextEl.textContent = 'Day (Fixed)';
    } else {
      const theme = matchSettings.lightingTheme || 'day';
      atmoTextEl.textContent = theme === 'night' ? 'Night' : (theme === 'sunset' ? 'Sunset' : 'Morning');
    }
  }

  const atmoDescEl = document.getElementById('setup-atmosphere-desc');
  if (atmoDescEl) {
    atmoDescEl.textContent = isCyber ? 'Day Only (Cyber Style)' : 'Morning / Sunset / Night';
  }

  // Stepper buttons locking for guests or atmosphere when cyber style is active
  if (settingsCol) {
    const stepButtons = settingsCol.querySelectorAll('button[onclick*="step"]');
    stepButtons.forEach(b => {
      const isAtmoStep = b.getAttribute('onclick')?.includes('stepAtmosphere');
      const shouldLock = isGuest || (isAtmoStep && isCyber);
      b.disabled = shouldLock;
      if (shouldLock) {
        b.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
        if (isAtmoStep && isCyber) b.title = 'Cyber style is locked to Day mode';
      } else {
        b.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
        b.removeAttribute('title');
      }
    });
  }

  // Board style buttons in setup lobby
  ['wood', 'cyberpunk', 'elegant'].forEach(style => {
    const btn = document.getElementById(`setup-board-${style}`);
    if (btn) {
      const active = (matchSettings.boardStyle || 'wood') === style;
      const lockedClasses = isGuest ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer';
      btn.className = `py-1 rounded-md text-[11px] font-black transition flex items-center justify-center ${lockedClasses} ${
        active ? 'bg-sky-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
      }`;
    }
  });

  // Board Edition buttons in setup lobby
  ['world', 'rajasthan'].forEach(ed => {
    const btn = document.getElementById(`setup-edition-${ed}`);
    if (btn) {
      const active = (matchSettings.boardEdition || 'world') === ed;
      const lockedClasses = isGuest ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer';
      btn.className = `py-1.5 px-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1 ${lockedClasses} ${
        active ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
      }`;
    }
  });

  // Lobby Edition Info Badge
  const badgeText = document.getElementById('lobby-edition-badge-text');
  if (badgeText) {
    badgeText.textContent = (matchSettings.boardEdition === 'rajasthan') ? 'Rajasthan Edition' : 'World Tour Edition';
  }
  const tilesText = document.getElementById('lobby-edition-tiles-text');
  if (tilesText) {
    tilesText.textContent = (matchSettings.boardEdition === 'rajasthan') ? '32 Royal Cities' : '32 Cities';
  }

  // HUD Board Style text
  const hudBoardText = document.getElementById('btn-board-style-text');
  if (hudBoardText) {
    const style = matchSettings.boardStyle || 'wood';
    hudBoardText.textContent = style === 'cyberpunk' ? 'Cyber' : (style === 'elegant' ? 'Elegant' : 'Wood');
  }

  // HUD Board Edition text
  const hudEditionText = document.getElementById('btn-board-edition-text');
  if (hudEditionText) {
    hudEditionText.textContent = (matchSettings.boardEdition === 'rajasthan') ? 'Rajasthan' : 'World';
  }

  // Update big lobby PLAY button for host vs guest
  const landingPlayBtn = document.getElementById('landing-play-btn');
  if (landingPlayBtn) {
    if (isGuest) {
      landingPlayBtn.disabled = true;
      landingPlayBtn.className = 'w-full max-w-xs py-4 sm:py-4.5 rounded-full font-rounded font-black text-lg sm:text-xl text-white tracking-widest uppercase game-btn bg-slate-500 shadow-xl opacity-75 cursor-not-allowed flex items-center justify-center gap-2';
      landingPlayBtn.innerHTML = '<i class="fa-solid fa-hourglass-half fa-spin text-lg mr-2"></i> WAITING FOR HOST...';
    } else {
      landingPlayBtn.disabled = false;
      landingPlayBtn.className = 'w-full max-w-xs py-4 sm:py-4.5 rounded-full font-rounded font-black text-2xl sm:text-3xl text-white tracking-widest uppercase game-btn game-btn-green shadow-2xl flex items-center justify-center';
      landingPlayBtn.innerHTML = '<i class="fa-solid fa-play text-xl mr-2"></i> PLAY';
    }
  }

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
      const otherOwner = matchSettings.customPlayers.find((p, idx) => 
        idx !== curIdx && idx < lobbyPlayerCount && (p.colorHex || '').toLowerCase() === cHex
      );
      const isTaken = Boolean(otherOwner);

      if (isTaken) {
        return `
          <button type="button" disabled aria-disabled="true" class="color-swatch-btn swatch-disabled" style="background:${c.hex}" title="${c.name} (Taken by ${otherOwner.name})" aria-label="${c.name} - Taken by ${otherOwner.name}">
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
