/**
 * ui/modals/leaderboard.js
 * Live Leaderboard modal, wealth rankings, and SVG Net Worth timeline chart.
 */

import { BOARD_TILES, PLAYER_THEMES } from '../../game/data.js';
import { gameState, matchSettings } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { calculatePlayerNetWorth, countCompletedColorGroups, checkLineMonopoly } from '../../game/rules.js';
import { networkState } from '../../network/p2p.js';
import { isLobbyScreenActive, closeOtherInformationalModals } from './common.js';
import { animateLeaderboardGauges, animateModalSpringOpen, animateModalSpringClose } from '../anim.js';
import { updateModalSlice } from '../../svelte/stores/modalStore.js';

/* ─────────────────────────────────────────────────────────────────────────────
   LIVE LEADERBOARD & NET WORTH STANDINGS MODAL
───────────────────────────────────────────────────────────────────────────── */
export function renderLeaderboardModal() {
  const players = gameState.players || [];
  if (!players.length) return;

  // Calculate detailed stats for each player
  const standings = players.map((p, idx) => {
    const netWorth = calculatePlayerNetWorth(idx);
    const sets = countCompletedColorGroups(idx);
    const lineMonopoly = checkLineMonopoly(idx);

    let ownedPropsCount = 0;
    let houseCount = 0;
    let propertyAssetVal = 0;
    for (const t of BOARD_TILES) {
      const st = gameState.properties[t.id];
      if (st && st.owner === idx) {
        ownedPropsCount++;
        propertyAssetVal += t.price;
        if (st.level > 0 && t.houseCost) {
          houseCount += st.level;
          propertyAssetVal += st.level * t.houseCost;
        }
      }
    }

    const theme = PLAYER_THEMES[idx] || { colorHex: '#6c5ce7', name: p.name };
    const isLocal = (idx === (networkState.isMultiplayer ? networkState.localPlayerIdx : 0));

    return {
      player: p,
      idx,
      theme,
      netWorth,
      cash: p.cash,
      sets,
      lineMonopoly,
      ownedPropsCount,
      houseCount,
      propertyAssetVal,
      isLocal,
      bankrupt: !!p.bankrupt,
      inIsland: !!p.inIsland
    };
  });

  // Sort descending by netWorth (bankrupt players at the bottom)
  standings.sort((a, b) => {
    if (a.bankrupt && !b.bankrupt) return 1;
    if (!a.bankrupt && b.bankrupt) return -1;
    return b.netWorth - a.netWorth;
  });

  // Total net worth for wealth market share calculation
  const totalNetWorth = standings.reduce((sum, s) => sum + Math.max(0, s.netWorth), 0) || 1;

  // Update match timer pill in modal header
  const durationMins = matchSettings.matchDurationMinutes || 15;
  const elapsedSecs = gameState.matchSeconds || 0;
  const remainingSecs = Math.max(0, (durationMins * 60) - elapsedSecs);
  const remM = Math.floor(remainingSecs / 60);
  const remS = remainingSecs % 60;
  const timeStr = `${String(remM).padStart(2, '0')}:${String(remS).padStart(2, '0')}`;
  const matchTimerText = `⏱️ ${timeStr} left (${durationMins}m cap)`;

  const timerBadge = document.getElementById('leaderboard-match-timer');
  if (timerBadge) {
    timerBadge.textContent = matchTimerText;
  }

  // Summary banner (who leads net worth & who is closest to Triple Monopoly)
  const leader = standings[0];
  const topSetsPlayer = [...standings].sort((a, b) => b.sets - a.sets)[0];
  const targetSets = matchSettings.monopolySetsToWin || 3;
  const summaryText = `👑 Wealth Leader: ${leader?.player.name || 'None'} (${fmtMoney(leader?.netWorth || 0)}) • 🏰 Sets Leader: ${topSetsPlayer?.player.name || 'None'} (${topSetsPlayer?.sets || 0}/${targetSets})`;

  const summaryBanner = document.getElementById('leaderboard-summary-banner');
  if (summaryBanner) {
    summaryBanner.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-base">👑</span>
        <span>Wealth Leader: <strong class="text-amber-900">${leader?.player.name || 'None'}</strong> with <strong class="text-emerald-700">${fmtMoney(leader?.netWorth || 0)}</strong></span>
      </div>
      <div class="flex items-center gap-2 text-slate-600">
        <span class="text-base">🏰</span>
        <span>Triple Monopoly Race: <strong class="text-indigo-900">${topSetsPlayer?.player.name || 'None'}</strong> (${topSetsPlayer?.sets || 0}/${targetSets} Sets)</span>
      </div>
    `;
  }

  const formattedStandings = standings.map((s, rankIdx) => ({
    rank: rankIdx + 1,
    name: s.player.name,
    colorHex: s.theme.colorHex,
    isLocal: s.isLocal,
    isAI: s.player.isAI,
    netWorthFormatted: fmtMoney(s.netWorth),
    cashFormatted: fmtMoney(s.cash),
    citiesCount: s.ownedPropsCount,
    setsCount: s.sets
  }));

  updateModalSlice('leaderboard', {
    visible: true,
    matchTimerText,
    summaryText,
    standings: formattedStandings
  });

  // Render post-match / in-match net worth timeline chart
  renderNetWorthTimelineChart('leaderboard-timeline-chart');
  animateLeaderboardGauges();
}

export function openLeaderboardModal() {
  if (isLobbyScreenActive()) return;
  closeOtherInformationalModals('modal-leaderboard');
  updateModalSlice('leaderboard', { visible: true });
  renderLeaderboardModal();
  animateModalSpringOpen('#modal-leaderboard');
  playSFX('hop');
}

export function closeLeaderboardModal() {
  updateModalSlice('leaderboard', { visible: false });
  animateModalSpringClose('#modal-leaderboard');
}

export function toggleLeaderboardModal() {
  const m = document.getElementById('modal-leaderboard');
  if (m && !m.classList.contains('hidden')) {
    closeLeaderboardModal();
  } else {
    openLeaderboardModal();
  }
}

/**
 * Renders an SVG multi-line Net Worth timeline chart.
 * Uses PLAYER_THEMES and reactive gameState.netWorthHistory.
 */
export function renderNetWorthTimelineChart(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const history = gameState.netWorthHistory || [];
  const players = gameState.players || [];

  if (players.length === 0) {
    container.innerHTML = '<div class="text-xs text-slate-400 font-bold text-center py-4">No match timeline data recorded</div>';
    return;
  }

  // Ensure at least two timeline data points
  let dataPoints = history.length > 0 ? [...history] : [];
  if (dataPoints.length === 0) {
    const initialVals = players.map(p => calculatePlayerNetWorth(p.id !== undefined ? p.id : players.indexOf(p)));
    dataPoints = [
      { turn: 0, values: initialVals },
      { turn: 1, values: initialVals }
    ];
  } else if (dataPoints.length === 1) {
    dataPoints.push({
      turn: dataPoints[0].turn + 1,
      values: [...dataPoints[0].values]
    });
  }

  // Calculate dynamic boundaries
  let minVal = Infinity;
  let maxVal = -Infinity;
  dataPoints.forEach(pt => {
    (pt.values || []).forEach(v => {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    });
  });

  if (minVal === Infinity || maxVal === -Infinity) {
    minVal = 0;
    maxVal = 3000000;
  }

  minVal = Math.max(0, Math.floor(minVal * 0.9));
  maxVal = Math.ceil(maxVal * 1.1);
  if (maxVal <= minVal) maxVal = minVal + 1000000;

  const width = 480;
  const height = 120;
  const padLeft = 52;
  const padRight = 16;
  const padTop = 14;
  const padBottom = 20;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Horizontal Grid Lines & Formatted Values
  const gridSteps = 3;
  let gridSvg = '';
  for (let g = 0; g <= gridSteps; g++) {
    const fraction = g / gridSteps;
    const yVal = minVal + fraction * (maxVal - minVal);
    const yPos = padTop + plotH - (fraction * plotH);
    gridSvg += `
      <line x1="${padLeft}" y1="${yPos.toFixed(1)}" x2="${(width - padRight).toFixed(1)}" y2="${yPos.toFixed(1)}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />
      <text x="${padLeft - 6}" y="${(yPos + 3).toFixed(1)}" text-anchor="end" font-size="8" font-weight="700" fill="#94a3b8">${fmtMoney(yVal)}</text>
    `;
  }

  // Draw Line Paths per player
  let linesSvg = '';
  let legendHtml = '';

  players.forEach((p, pIdx) => {
    if (!p) return;
    const theme = PLAYER_THEMES[pIdx] || {};
    const color = theme.colorHex || p.colorHex || '#3b82f6';

    const coords = dataPoints.map((pt, i) => {
      const x = padLeft + (i / (dataPoints.length - 1)) * plotW;
      const val = pt.values && pt.values[pIdx] !== undefined ? pt.values[pIdx] : 0;
      const y = padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;
      return { x, y, val };
    });

    const pathD = coords.map((c, i) => (i === 0 ? `M ${c.x.toFixed(1)} ${c.y.toFixed(1)}` : `L ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)).join(' ');
    const lastCoord = coords[coords.length - 1];

    linesSvg += `
      <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="${p.bankrupt ? '0.35' : '0.95'}" />
      <circle cx="${lastCoord.x.toFixed(1)}" cy="${lastCoord.y.toFixed(1)}" r="3" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
    `;

    legendHtml += `
      <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${color}"></span>
        <span class="truncate max-w-[65px] uppercase">${p.name}</span>
        <span class="text-slate-400 font-semibold">${fmtMoney(lastCoord.val)}</span>
      </div>
    `;
  });

  container.innerHTML = `
    <div class="w-full flex flex-col items-center">
      <svg viewBox="0 0 ${width} ${height}" class="w-full h-auto max-h-28 overflow-visible">
        ${gridSvg}
        ${linesSvg}
      </svg>
      <div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1 px-1 border-t border-slate-100 pt-1 w-full">
        ${legendHtml}
      </div>
    </div>
  `;
}
