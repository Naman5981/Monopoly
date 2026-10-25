/**
 * ui/hud/statusPill.js
 * Bottom-center real-time game status pill, player thinking states, event logging, and dice sum badge.
 */

import { PLAYER_THEMES } from '../../game/data.js';
import { gameState, matchSettings } from '../../game/state.js';
import { networkState } from '../../network/p2p.js';
import { animateToastAccordionPush } from '../anim.js';

let statusPillResetTimer = null;
let currentThinkingState = null;
let diceSumTimer = null;

/** Clears any active thinking state and pending reset timers. */
export function clearThinkingState() {
  currentThinkingState = null;
  if (statusPillResetTimer) {
    clearTimeout(statusPillResetTimer);
    statusPillResetTimer = null;
  }
}

/**
 * Updates the bottom-center pill shape status bar.
 * Acts as a single source of truth for player thinking states and realtime event logs.
 * @param {string} htmlContent
 * @param {{ isThinking?: boolean, playerIdx?: number, icon?: string, durationMs?: number }} options
 */
export function setStatusPill(htmlContent, options = {}) {
  const wrap = document.getElementById('hud-bottom-status-wrap');
  const pill = document.getElementById('hud-status-pill');
  const textEl = document.getElementById('hud-status-pill-text');
  const dotEl = document.getElementById('hud-status-pill-dot');
  const iconEl = document.getElementById('hud-status-pill-icon');
  if (!pill || !textEl) return;

  if (wrap) wrap.classList.remove('hidden');

  const { isThinking = false, playerIdx = null, icon = null, durationMs = 3800 } = options;

  if (isThinking) {
    currentThinkingState = { htmlContent, options: { ...options, playerIdx } };
  }

  textEl.innerHTML = htmlContent;

  if (playerIdx !== null && playerIdx !== undefined && PLAYER_THEMES[playerIdx]) {
    if (dotEl) {
      dotEl.style.backgroundColor = PLAYER_THEMES[playerIdx].colorHex;
      dotEl.className = isThinking ? 'w-2.5 h-2.5 rounded-full animate-ping' : 'w-2.5 h-2.5 rounded-full';
    }
  } else if (dotEl) {
    dotEl.style.backgroundColor = isThinking ? '#38bdf8' : '#fbbf24';
    dotEl.className = isThinking ? 'w-2.5 h-2.5 rounded-full animate-pulse' : 'w-2.5 h-2.5 rounded-full';
  }

  if (iconEl) {
    if (icon) {
      iconEl.innerHTML = icon;
      iconEl.classList.remove('hidden');
    } else if (isThinking) {
      iconEl.innerHTML = '<span class="inline-block animate-spin text-sky-400 text-xs">⚡</span>';
      iconEl.classList.remove('hidden');
    } else {
      iconEl.classList.add('hidden');
    }
  }

  pill.classList.toggle('pill-thinking', isThinking);
  pill.classList.remove('pill-event-pop');
  void pill.offsetWidth;
  pill.classList.add('pill-event-pop');

  if (statusPillResetTimer) {
    clearTimeout(statusPillResetTimer);
    statusPillResetTimer = null;
  }

  if (!isThinking && durationMs > 0) {
    statusPillResetTimer = setTimeout(() => {
      statusPillResetTimer = null;
      // Only restore thinking state if it belongs to the CURRENT active player
      if (currentThinkingState && currentThinkingState.options?.playerIdx === gameState.currentPlayerIdx) {
        setStatusPill(currentThinkingState.htmlContent, currentThinkingState.options);
      } else {
        currentThinkingState = null;
        refreshActivePlayerTurnStatus();
      }
    }, durationMs);
  }
}

/**
 * Refreshes the active player's thinking / actionable state on the status pill.
 */
export function refreshActivePlayerTurnStatus() {
  if (!gameState.gameStarted || gameState.phase === 'SETUP') {
    setStatusPill('Welcome to World Tycoon! Roll to start.', { isThinking: false, durationMs: 0 });
    return;
  }
  const curIdx = gameState.currentPlayerIdx;
  const p = gameState.players[curIdx];
  if (!p) return;

  const isLocalHuman = (curIdx === (networkState.isMultiplayer ? networkState.localPlayerIdx : 0)) && !p.isAI;

  if (isLocalHuman) {
    currentThinkingState = null;
    if (p.inIsland) {
      if (p.cash >= 150000) {
        setStatusPill(`🏝️ <strong>Island Detention (${p.islandTurns || 0}/3)</strong> — Pay $150K bail or roll doubles to escape!`, { isThinking: false, playerIdx: curIdx, durationMs: 0 });
      } else {
        setStatusPill(`🏝️ <strong>Island Detention (${p.islandTurns || 0}/3)</strong> — Need $150K for bail! Roll doubles to escape!`, { isThinking: false, playerIdx: curIdx, durationMs: 0 });
      }
    } else if (gameState.phase === 'ROLL') {
      const isDoublesReRoll = (gameState.doublesCount || 0) > 0;
      const rollPrompt = isDoublesReRoll
        ? `🎲 <strong>Doubles Re-Roll!</strong> — Roll the dice or press Space!`
        : `🎲 <strong>Your Turn</strong> — Roll the dice or press Space!`;
      setStatusPill(rollPrompt, { isThinking: false, playerIdx: curIdx, durationMs: 0 });
    } else if (gameState.phase === 'END') {
      setStatusPill(`✨ <strong>Turn ending</strong>...`, { isThinking: false, playerIdx: curIdx, durationMs: 0 });
    }
  } else if (p.isAI) {
    if (p.inIsland) {
      setStatusPill(`🤔 <strong>${p.name}</strong> is rolling for doubles to leave the Island...`, { isThinking: true, playerIdx: curIdx });
    } else {
      setStatusPill(`🤔 <strong>${p.name}</strong> is thinking...`, { isThinking: true, playerIdx: curIdx });
    }
  } else {
    if ((gameState.doublesCount || 0) > 0 && gameState.phase === 'ROLL') {
      setStatusPill(`🎲 <strong>${p.name}</strong> rolled doubles! Waiting for their extra roll...`, { isThinking: true, playerIdx: curIdx });
    } else {
      setStatusPill(`⏳ Waiting for <strong>${p.name}</strong>'s move...`, { isThinking: true, playerIdx: curIdx });
    }
  }
}

/** Log an event to the event log drawer and display on real-time bottom-center pill. */
export function logEvent(html) {
  const log = document.getElementById('activity-log');
  if (log) {
    const div = document.createElement('div');
    div.className = 'border-l-2 border-indigo-400 pl-2 py-0.5';
    div.innerHTML = html;
    log.prepend(div);
    animateToastAccordionPush(div);
  }
  setStatusPill(html, { isThinking: false, durationMs: 4200 });
}

/**
 * Display ephemeral roll sum badge in center park area with auto-dismiss.
 * @param {string} resultStr - E.g. "🎲 5 + 4 = 9"
 * @param {number} durationMs - Auto-dismiss timeout (defaults to 1800ms)
 */
export function showDiceSumBadge(resultStr, durationMs = 1800) {
  const sumBadge = document.getElementById('dice-sum-badge');
  if (!sumBadge) return;
  if (diceSumTimer) {
    clearTimeout(diceSumTimer);
    diceSumTimer = null;
  }
  sumBadge.textContent = resultStr;
  sumBadge.classList.remove('hidden');
  sumBadge.style.display = 'inline-flex';
  sumBadge.style.opacity = '0';
  sumBadge.style.transform = 'scale(0.85)';

  requestAnimationFrame(() => {
    sumBadge.style.opacity = '1';
    sumBadge.style.transform = 'scale(1)';
  });

  const speed = matchSettings?.gameSpeed || 1;
  const timeoutMs = Math.max(600, Math.round(durationMs / speed));

  diceSumTimer = setTimeout(() => {
    hideDiceSumBadge();
  }, timeoutMs);
}

/**
 * Immediately dismiss and hide the dice sum badge.
 */
export function hideDiceSumBadge() {
  if (diceSumTimer) {
    clearTimeout(diceSumTimer);
    diceSumTimer = null;
  }
  const sumBadge = document.getElementById('dice-sum-badge');
  if (!sumBadge) return;
  sumBadge.style.opacity = '0';
  sumBadge.style.transform = 'scale(0.85)';
  setTimeout(() => {
    if (!diceSumTimer) {
      sumBadge.classList.add('hidden');
      sumBadge.style.display = 'none';
    }
  }, 220);
}

/** Handles clicks onto the bottom-center status pill: rolls dice if actionable turn, or opens event drawer. */
export function handleStatusPillClick() {
  const p = gameState.players ? gameState.players[gameState.currentPlayerIdx] : null;
  const isLocalHuman = p && !p.isAI && (gameState.currentPlayerIdx === (networkState.isMultiplayer ? networkState.localPlayerIdx : 0));
  if (gameState.gameStarted && (gameState.phase === 'ROLL' || gameState.phase === 'END') && isLocalHuman) {
    if (typeof window.handleRollButtonClick === 'function') {
      window.handleRollButtonClick();
      return;
    }
  }
  if (typeof window.toggleEventLogDrawer === 'function') {
    window.toggleEventLogDrawer();
  }
}

if (typeof window !== 'undefined') {
  window.showDiceSumBadge = showDiceSumBadge;
  window.hideDiceSumBadge = hideDiceSumBadge;
  window.handleStatusPillClick = handleStatusPillClick;
}
