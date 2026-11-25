/**
 * test/multiplayer/networth_trajectory.test.js
 * Unit tests for Leaderboard Net Worth Trajectory chart geometry, velocity, and P2P sync.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { get } from 'svelte/store';
import { gameState, matchSettings } from '../../src/game/state.js';
import { networkState } from '../../src/network/p2pState.js';
import { broadcastFullGameState } from '../../src/network/p2pHost.js';
import { advanceTurn } from '../../src/game/engine/turnCycle.js';
import { buildNetWorthChartData, renderLeaderboardModal } from '../../src/ui/modals/leaderboard.js';
import { modalStore } from '../../src/svelte/stores/modalStore.js';

describe('Leaderboard Net Worth Trajectory & P2P Sync', () => {
  beforeEach(() => {
    networkState.isMultiplayer = false;
    networkState.isHost = false;
    networkState.localPlayerIdx = 0;
    networkState.connections.clear();

    matchSettings.matchDurationMinutes = 15;
    matchSettings.monopolySetsToWin = 3;

    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.properties = {};
    gameState.players = [
      { id: 0, name: 'P1', cash: 2500000, position: 0, bankrupt: false, isAI: false },
      { id: 1, name: 'P2', cash: 1800000, position: 4, bankrupt: false, isAI: true },
      { id: 2, name: 'P3', cash: 1500000, position: 8, bankrupt: false, isAI: true },
      { id: 3, name: 'P4', cash: 2000000, position: 2, bankrupt: false, isAI: true }
    ];
    gameState.netWorthHistory = [
      { turn: 1, time: '1', values: [2000000, 2000000, 2000000, 2000000] },
      { turn: 2, time: '2', values: [2150000, 1950000, 1850000, 2000000] },
      { turn: 3, time: '3', values: [2350000, 1850000, 1650000, 2000000] },
      { turn: 4, time: '4', values: [2500000, 1800000, 1500000, 2000000] }
    ];
  });

  it('generates smooth cubic bezier paths, area paths, xTicks, and accessible markers', () => {
    const chart = buildNetWorthChartData();
    assert.equal(chart.empty, false);
    assert.equal(chart.series.length, 4);
    assert.equal(chart.turns.length, 4);
    assert.ok(chart.xTicks.length >= 2);
    assert.equal(chart.xTicks[0].label, 'Start');
    assert.ok(chart.xTicks[chart.xTicks.length - 1].label.includes('Now'));

    for (const s of chart.series) {
      assert.ok(s.path.startsWith('M '), 'path should start with M');
      assert.ok(s.path.includes(' C '), 'path should use cubic bezier curves');
      assert.ok(s.areaPath.endsWith(' Z'), 'areaPath should be closed');
      assert.ok(['circle', 'diamond', 'square', 'triangle'].includes(s.shape));
      assert.equal(s.points.length, 4);
    }
  });

  it('safely handles empty or single-turn netWorthHistory', () => {
    gameState.netWorthHistory = [];
    const emptyHistChart = buildNetWorthChartData();
    assert.equal(emptyHistChart.empty, false);
    assert.equal(emptyHistChart.turns.length, 2);

    gameState.netWorthHistory = [{ turn: 1, time: '1', values: [2000000, 2000000, 2000000, 2000000] }];
    const singleHistChart = buildNetWorthChartData();
    assert.equal(singleHistChart.empty, false);
    assert.equal(singleHistChart.turns.length, 2);
  });

  it('populates velocity momentum pills and playerIdx in standings store', () => {
    renderLeaderboardModal();
    const lb = get(modalStore).leaderboard;
    assert.equal(lb.standings.length, 4);

    const p1 = lb.standings.find(s => s.name === 'P1');
    const p2 = lb.standings.find(s => s.name === 'P2');
    const p4 = lb.standings.find(s => s.name === 'P4');

    assert.equal(p1.playerIdx, 0);
    assert.equal(p1.velocity.trend, 'up');
    assert.ok(p1.velocity.formattedDelta.startsWith('+'));

    assert.equal(p2.velocity.trend, 'down');
    assert.ok(p2.velocity.formattedDelta.startsWith('-'));

    assert.equal(p4.velocity.trend, 'flat');
    assert.equal(p4.velocity.formattedDelta, 'Steady');
  });

  it('includes netWorthHistory in broadcastFullGameState FULL_STATE_SYNC payload', () => {
    networkState.isMultiplayer = true;
    networkState.isHost = true;

    const sentPackets = [];
    networkState.connections.set('peer-1', {
      open: true,
      send: (pkt) => sentPackets.push(pkt)
    });

    broadcastFullGameState();
    assert.equal(sentPackets.length, 1);
    const syncPkt = sentPackets[0];
    assert.equal(syncPkt.type, 'FULL_STATE_SYNC');
    assert.ok(Array.isArray(syncPkt.gameState.netWorthHistory));
    assert.equal(syncPkt.gameState.netWorthHistory.length, 4);
    assert.deepEqual(syncPkt.gameState.netWorthHistory[3].values, [2500000, 1800000, 1500000, 2000000]);
  });

  it('records netWorthHistory once per full table round (wrap-around), even if Player 1 is bankrupt', () => {
    gameState.netWorthHistory = [{ turn: 0, time: 'R0', values: [2000000, 2000000, 2000000, 2000000] }];
    gameState.currentPlayerIdx = 0;
    gameState.turnNumber = 1;
    gameState.phase = 'ACTION';

    // P1 -> P2 (mid-round: no snapshot)
    advanceTurn(false);
    assert.equal(gameState.currentPlayerIdx, 1);
    assert.equal(gameState.netWorthHistory.length, 1);

    // P2 -> P3 (mid-round: no snapshot)
    gameState.phase = 'ACTION';
    advanceTurn(false);
    assert.equal(gameState.currentPlayerIdx, 2);
    assert.equal(gameState.netWorthHistory.length, 1);

    // P3 -> P4 (mid-round: no snapshot)
    gameState.phase = 'ACTION';
    advanceTurn(false);
    assert.equal(gameState.currentPlayerIdx, 3);
    assert.equal(gameState.netWorthHistory.length, 1);

    // P4 -> P1 (full round wrap-around: records R1)
    gameState.phase = 'ACTION';
    advanceTurn(false);
    assert.equal(gameState.currentPlayerIdx, 0);
    assert.equal(gameState.netWorthHistory.length, 2);
    assert.equal(gameState.netWorthHistory[1].time, 'R1');

    // Bankrupt P1, advance P4 -> P2 (wrap-around skipping P1: records R2)
    gameState.players[0].bankrupt = true;
    gameState.currentPlayerIdx = 3;
    gameState.phase = 'ACTION';
    advanceTurn(false);
    assert.equal(gameState.currentPlayerIdx, 1);
    assert.equal(gameState.netWorthHistory.length, 3);
    assert.equal(gameState.netWorthHistory[2].time, 'R2');
  });

  it('appends transient Live tip when mid-round net worth changes without mutating netWorthHistory', () => {
    gameState.netWorthHistory = [
      { turn: 0, time: 'R0', values: [2000000, 2000000, 2000000, 2000000] }
    ];
    gameState.players[0].cash = 2400000;
    const chart = buildNetWorthChartData();
    assert.equal(gameState.netWorthHistory.length, 1);
    assert.equal(chart.turns.length, 2);
    assert.equal(chart.turns[1].isLive, true);
    assert.equal(chart.xTicks[1].label, 'Now');
  });
});
