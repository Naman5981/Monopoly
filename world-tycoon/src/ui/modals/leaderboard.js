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
    playerIdx: s.idx,
    name: s.player.name,
    colorHex: s.theme.colorHex,
    isLocal: s.isLocal,
    isAI: s.player.isAI,
    netWorthFormatted: fmtMoney(s.netWorth),
    cashFormatted: fmtMoney(s.cash),
    citiesCount: s.ownedPropsCount,
    setsCount: s.sets,
    velocity: computePlayerVelocity(s.idx, gameState.netWorthHistory || [], s.netWorth)
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

const SERIES_SHAPES = ['circle', 'diamond', 'square', 'triangle', 'circle', 'diamond'];
const SERIES_DASHES = ['none', 'none', '4,2', '2,2', '6,3', '3,3'];

function computePlayerVelocity(playerIdx, history, currentNetWorth) {
  if (!history || history.length < 2) {
    return { delta: 0, formattedDelta: 'Steady', trend: 'flat' };
  }
  const lookbackIdx = Math.max(0, history.length - 4);
  const pastVals = history[lookbackIdx]?.values || [];
  const pastVal = pastVals[playerIdx] !== undefined ? pastVals[playerIdx] : currentNetWorth;
  const delta = currentNetWorth - pastVal;

  if (delta > 1000) {
    return { delta, formattedDelta: `+${fmtMoney(delta)}`, trend: 'up' };
  }
  if (delta < -1000) {
    return { delta, formattedDelta: `-${fmtMoney(Math.abs(delta))}`, trend: 'down' };
  }
  return { delta: 0, formattedDelta: 'Steady', trend: 'flat' };
}

function pointsToSmoothPath(coords) {
  if (!coords || coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = i > 0 ? coords[i - 1] : coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = i < coords.length - 2 ? coords[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function buildXAxisTicks(dataPoints, padLeft, plotW) {
  const count = dataPoints.length;
  if (count <= 1) return [{ x: padLeft.toFixed(1), label: 'Start', turn: 0 }];

  const maxTicks = 5;
  const step = count <= maxTicks ? 1 : Math.ceil((count - 1) / (maxTicks - 1));
  const indices = new Set([0, count - 1]);
  for (let i = step; i < count - 1; i += step) {
    indices.add(i);
  }

  return Array.from(indices).sort((a, b) => a - b).map(idx => {
    const x = padLeft + (idx / (count - 1)) * plotW;
    const turn = dataPoints[idx]?.turn ?? idx;
    let label = `T${turn}`;
    if (idx === 0) label = 'Start';
    else if (idx === count - 1) label = `T${turn} (Now)`;
    return { x: x.toFixed(1), label, turn };
  });
}

export function buildNetWorthChartData() {
  const history = gameState.netWorthHistory || [];
  const players = gameState.players || [];
  if (players.length === 0) return { empty: true, gridLines: [], series: [], xTicks: [], turns: [] };

  let dataPoints = history.length > 0 ? [...history] : [];
  if (dataPoints.length === 0) {
    const initialVals = players.map(p => calculatePlayerNetWorth(p.id !== undefined ? p.id : players.indexOf(p)));
    dataPoints = [
      { turn: 0, values: initialVals },
      { turn: 1, values: initialVals }
    ];
  } else if (dataPoints.length === 1) {
    dataPoints.push({
      turn: (dataPoints[0].turn || 0) + 1,
      values: [...dataPoints[0].values]
    });
  }

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

  const width = 440;
  const height = 132;
  const padLeft = 50;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 26;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const bottomY = padTop + plotH;

  const gridSteps = 3;
  const gridLines = [];
  for (let g = 0; g <= gridSteps; g++) {
    const fraction = g / gridSteps;
    const yVal = minVal + fraction * (maxVal - minVal);
    const yPos = bottomY - (fraction * plotH);
    gridLines.push({ y: yPos.toFixed(1), labelY: (yPos + 3).toFixed(1), value: fmtMoney(yVal) });
  }

  const localIdx = networkState.isMultiplayer ? networkState.localPlayerIdx : 0;

  const series = players.map((p, pIdx) => {
    const theme = PLAYER_THEMES[pIdx] || {};
    const color = theme.colorHex || p.colorHex || '#3b82f6';
    const isLocal = pIdx === localIdx;

    const coords = dataPoints.map((pt, i) => {
      let x = padLeft + (i / (dataPoints.length - 1)) * plotW;
      if (i === 0) {
        x += (pIdx - (players.length - 1) / 2) * 2;
      }
      const val = pt.values && pt.values[pIdx] !== undefined ? pt.values[pIdx] : 0;
      const y = bottomY - ((val - minVal) / (maxVal - minVal)) * plotH;
      return { x, y, val, formatted: fmtMoney(val) };
    });

    const pathD = pointsToSmoothPath(coords);
    const firstCoord = coords[0];
    const lastCoord = coords[coords.length - 1];
    const areaPath = `${pathD} L ${lastCoord.x.toFixed(1)} ${bottomY.toFixed(1)} L ${firstCoord.x.toFixed(1)} ${bottomY.toFixed(1)} Z`;

    return {
      playerIdx: pIdx,
      name: p.name,
      color,
      isLocal,
      bankrupt: Boolean(p.bankrupt),
      shape: SERIES_SHAPES[pIdx % SERIES_SHAPES.length],
      dashArray: SERIES_DASHES[pIdx % SERIES_DASHES.length],
      opacity: p.bankrupt ? '0.35' : '0.95',
      path: pathD,
      areaPath,
      points: coords.map(c => ({
        x: Number(c.x.toFixed(1)),
        y: Number(c.y.toFixed(1)),
        val: c.val,
        formatted: c.formatted
      })),
      firstX: firstCoord.x.toFixed(1),
      firstY: firstCoord.y.toFixed(1),
      lastX: lastCoord.x.toFixed(1),
      lastY: lastCoord.y.toFixed(1),
      lastValue: lastCoord.formatted
    };
  });

  const turns = dataPoints.map((pt, i) => ({
    index: i,
    turn: pt.turn ?? i,
    x: Number((padLeft + (i / (dataPoints.length - 1)) * plotW).toFixed(1))
  }));

  const xTicks = buildXAxisTicks(dataPoints, padLeft, plotW);

  return {
    empty: false,
    width,
    height,
    padLeft,
    padTop,
    bottomY,
    plotW,
    right: width - padRight,
    gridLines,
    xTicks,
    turns,
    series
  };
}
