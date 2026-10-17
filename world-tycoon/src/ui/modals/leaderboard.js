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
import { isLobbyScreenActive } from './common.js';
import { animateLeaderboardGauges } from '../anim.js';

/* ─────────────────────────────────────────────────────────────────────────────
   LIVE LEADERBOARD & NET WORTH STANDINGS MODAL
───────────────────────────────────────────────────────────────────────────── */
export function renderLeaderboardModal() {
  const container = document.getElementById('leaderboard-players-list');
  if (!container) return;

  const players = gameState.players || [];
  if (!players.length) {
    container.innerHTML = `<div class="text-center py-8 text-slate-500 font-bold">No active match in progress.</div>`;
    return;
  }

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
  const timerBadge = document.getElementById('leaderboard-match-timer');
  if (timerBadge) {
    const durationMins = matchSettings.matchDurationMinutes || 15;
    const elapsedSecs = gameState.matchSeconds || 0;
    const remainingSecs = Math.max(0, (durationMins * 60) - elapsedSecs);
    const remM = Math.floor(remainingSecs / 60);
    const remS = remainingSecs % 60;
    const timeStr = `${String(remM).padStart(2, '0')}:${String(remS).padStart(2, '0')}`;
    timerBadge.textContent = `⏱️ ${timeStr} left (${durationMins}m cap)`;
  }

  // Summary banner (who leads net worth & who is closest to Triple Monopoly)
  const summaryBanner = document.getElementById('leaderboard-summary-banner');
  if (summaryBanner) {
    const leader = standings[0];
    const topSetsPlayer = [...standings].sort((a, b) => b.sets - a.sets)[0];
    const targetSets = matchSettings.monopolySetsToWin || 3;
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

  // Render player cards
  const medals = ['🥇', '🥈', '🥉'];
  container.innerHTML = standings.map((st, rankIdx) => {
    const rank = rankIdx + 1;
    const medal = rank <= 3 ? medals[rank - 1] : `#${rank}`;
    const sharePercent = Math.min(100, Math.max(0, Math.round((st.netWorth / totalNetWorth) * 100)));
    const isLeader = rank === 1 && !st.bankrupt;

    const rankBorder = isLeader
      ? 'border-2 border-amber-400 bg-gradient-to-r from-amber-50/90 via-white to-amber-50/50 shadow-md ring-2 ring-amber-300/40'
      : (st.bankrupt ? 'border border-slate-200 bg-slate-100/70 opacity-60' : 'border border-slate-200 bg-white hover:border-sky-300 shadow-xs');

    return `
      <div class="rounded-2xl p-3.5 sm:p-4 transition ${rankBorder}">
        <div class="flex items-center justify-between gap-3">
          
          <!-- Left: Rank & Avatar & Name -->
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="w-8 h-8 rounded-full ${isLeader ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-100 text-slate-700 font-bold'} flex items-center justify-center text-sm shadow-xs flex-shrink-0">
              ${medal}
            </div>
            
            <div class="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center font-black text-white text-sm flex-shrink-0" style="background:${st.theme.colorHex}">
              ${(st.player.name || 'P')[0].toUpperCase()}
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-black text-sm sm:text-base text-slate-900 truncate uppercase">${st.player.name}</span>
                ${st.isLocal ? '<span class="text-[10px] font-black bg-sky-500 text-white px-2 py-0.5 rounded-full shadow-2xs">YOU</span>' : ''}
                ${st.player.isAI ? '<span class="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md border border-slate-200">BOT</span>' : ''}
                ${st.inIsland ? '<span class="text-[10px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md border border-amber-300">🏝️ ISLAND</span>' : ''}
                ${st.bankrupt ? '<span class="text-[10px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md border border-rose-300">BANKRUPT</span>' : ''}
                ${st.lineMonopoly > 0 ? '<span class="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md border border-emerald-300">👑 EDGE WIN</span>' : ''}
              </div>
              <div class="text-xs text-slate-500 font-semibold flex items-center gap-2 mt-0.5 flex-wrap">
                <span>💵 Cash: <strong class="text-slate-800 font-bold">${st.bankrupt ? '$0' : fmtMoney(st.cash)}</strong></span>
                <span>•</span>
                <span>🏙️ Properties: <strong class="text-slate-800 font-bold">${st.ownedPropsCount} (${st.houseCount} 🏠)</strong></span>
                <span>•</span>
                <span>🏰 Monopolies: <strong class="text-indigo-700 font-bold">${st.sets}/3</strong></span>
              </div>
            </div>
          </div>

          <!-- Right: Total Net Worth Badge -->
          <div class="text-right flex-shrink-0">
            <div class="text-[10px] font-black uppercase text-slate-400 tracking-wider">NET WORTH</div>
            <div class="font-display font-black text-base sm:text-lg ${isLeader ? 'text-amber-600' : 'text-slate-900'} leading-tight">
              ${st.bankrupt ? '<span class="text-rose-500 font-bold text-sm">ELIMINATED</span>' : fmtMoney(st.netWorth)}
            </div>
            <div class="text-[10px] font-extrabold text-slate-500 mt-0.5">
              ${st.bankrupt ? '0% share' : `${sharePercent}% wealth share`}
            </div>
          </div>

        </div>

        <!-- Wealth Market Share Bar -->
        ${!st.bankrupt ? `
        <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
          <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div class="net-worth-bar-fill origin-left h-full rounded-full transition-[width] duration-500" style="width: ${sharePercent}%; background:${st.theme.colorHex}"></div>
          </div>
          <span class="text-[10px] font-bold text-slate-400 tabular-nums">${sharePercent}%</span>
        </div>
        ` : ''}

      </div>
    `;
  }).join('');

  // Render post-match / in-match net worth timeline chart
  renderNetWorthTimelineChart('leaderboard-timeline-chart');
  animateLeaderboardGauges();
}

export function openLeaderboardModal() {
  if (isLobbyScreenActive()) return;
  renderLeaderboardModal();
  const m = document.getElementById('modal-leaderboard');
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('flex');
    playSFX('hop');
  }
}

export function closeLeaderboardModal() {
  const m = document.getElementById('modal-leaderboard');
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('flex');
  }
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
