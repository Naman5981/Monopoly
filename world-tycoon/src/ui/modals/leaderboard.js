/**
 * ui/modals/leaderboard.js
 * Live Leaderboard modal, wealth rankings, and SVG Net Worth timeline chart.
 */

import { BOARD_TILES, PLAYER_THEMES } from '../../game/data.js';
import { gameState, matchSettings } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX } from '../../game/audio.js';
import { calculatePlayerNetWorth, countCompletedColorGroups } from '../../game/rules.js';
import { networkState } from '../../network/p2p.js';
import { isLobbyScreenActive, closeOtherInformationalModals } from './common.js';
import { animateModalSpringOpen, animateModalSpringClose } from '../anim.js';
import { get } from 'svelte/store';
import { modalStore, updateModalSlice } from '../../svelte/stores/modalStore.js';

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
    let ownedPropsCount = 0;
    for (const t of BOARD_TILES) {
      const st = gameState.properties[t.id];
      if (st && st.owner === idx) {
        ownedPropsCount++;
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
      ownedPropsCount,
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

  // Update match timer pill in modal header
  const durationMins = matchSettings.matchDurationMinutes || 15;
  const elapsedSecs = gameState.matchSeconds || 0;
  const remainingSecs = Math.max(0, (durationMins * 60) - elapsedSecs);
  const remM = Math.floor(remainingSecs / 60);
  const remS = remainingSecs % 60;
  const timeStr = `${String(remM).padStart(2, '0')}:${String(remS).padStart(2, '0')}`;
  const matchTimerText = `⏱️ ${timeStr} left (${durationMins}m cap)`;

  // Summary banner (who leads net worth & who is closest to Triple Monopoly)
  const leader = standings[0];
  const topSetsPlayer = [...standings].sort((a, b) => b.sets - a.sets)[0];
  const targetSets = matchSettings.monopolySetsToWin || 3;
  const summaryText = `👑 Wealth Leader: ${leader?.player.name || 'None'} (${fmtMoney(leader?.netWorth || 0)}) • 🏰 Sets Leader: ${topSetsPlayer?.player.name || 'None'} (${topSetsPlayer?.sets || 0}/${targetSets})`;

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
    standings: formattedStandings,
    historyChart: buildNetWorthChartData()
  });

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
  if (get(modalStore).leaderboard.visible) {
    closeLeaderboardModal();
  } else {
    openLeaderboardModal();
  }
}

export function buildNetWorthChartData() {
  const history = gameState.netWorthHistory || [];
  const players = gameState.players || [];
  if (players.length === 0) return { empty: true, gridLines: [], series: [] };

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
  const gridLines = [];
  for (let g = 0; g <= gridSteps; g++) {
    const fraction = g / gridSteps;
    const yVal = minVal + fraction * (maxVal - minVal);
    const yPos = padTop + plotH - (fraction * plotH);
    gridLines.push({ y: yPos.toFixed(1), labelY: (yPos + 3).toFixed(1), value: fmtMoney(yVal) });
  }

  const series = players.map((p, pIdx) => {
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

    return {
      name: p.name,
      color,
      opacity: p.bankrupt ? '0.35' : '0.95',
      path: pathD,
      lastX: lastCoord.x.toFixed(1),
      lastY: lastCoord.y.toFixed(1),
      lastValue: fmtMoney(lastCoord.val)
    };
  });

  return { empty: false, width, height, padLeft, right: width - padRight, gridLines, series };
}
