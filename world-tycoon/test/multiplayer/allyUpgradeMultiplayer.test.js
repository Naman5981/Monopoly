/**
 * test/multiplayer/allyUpgradeMultiplayer.test.js
 * Unit test suite for Ally City Upgrade deduction and animation guards in multiplayer Team Mode:
 * - Visiting player (Host or Guest) pays the upgrade fee, NOT the AI teammate.
 * - When AI teammate has $0 cash, visiting player with funds can upgrade cleanly.
 * - When visiting player has insufficient funds, upgrade fails without false coin shower animation.
 * - P2P ACTION_UPGRADE_CITY relays properly and syncs deduction to visiting player.
 * - Modal slice contains isAlly and ownerName for clear reactive UI.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { gameState, matchSettings } from '../../src/game/state.js';
import { BOARD_TILES } from '../../src/game/data.js';
import { networkState, registerNetworkCallbacks } from '../../src/network/p2pState.js';
import { executeIncomingNetworkAction } from '../../src/network/p2pActions.js';
import { upgradeCityLevel, buildInspectorSliceData } from '../../src/ui/modals/inspector.js';
import {
  openUpgradeCityModal,
  renderUpgradeModalContent,
  confirmUpgradeFromModal,
  confirmUpgradeTwoLevelsFromModal
} from '../../src/ui/modals/upgradeCity.js';
import { modalStore } from '../../src/svelte/stores/modalStore.js';
import { PropertyLandingStrategy } from '../../src/game/engine/strategies/PropertyLandingStrategy.js';

describe('Multiplayer Ally City Upgrade in Team Mode', () => {
  let broadcastedActions = [];

  beforeEach(() => {
    matchSettings.teamMode = true;
    networkState.isMultiplayer = true;
    networkState.isHost = true;
    networkState.localPlayerIdx = 0;
    networkState.connections.clear();

    broadcastedActions = [];
    networkState.connections.set('mock-peer', {
      peer: 'mock-peer',
      open: true,
      send: (data) => broadcastedActions.push(data)
    });

    gameState.gameStarted = true;
    gameState.phase = 'MODAL';
    gameState.currentPlayerIdx = 0; // Host (Player 0)
    gameState.upgradesThisVisit = 0;

    // Team 0: Player 0 (Host, Human) & Player 1 (Teammate, AI)
    // Team 1: Player 2 (Guest, Human) & Player 3 (Enemy, AI)
    gameState.players = [
      { id: 0, name: 'Host Nova', cash: 2000000, position: 1, teamId: 0, bankrupt: false, isAI: false },
      { id: 1, name: 'AI Teammate', cash: 0, position: 10, teamId: 0, bankrupt: false, isAI: true },
      { id: 2, name: 'Guest Alice', cash: 2000000, position: 15, teamId: 1, bankrupt: false, isAI: false },
      { id: 3, name: 'AI Rival', cash: 2000000, position: 20, teamId: 1, bankrupt: false, isAI: true }
    ];

    gameState.properties = {};
    BOARD_TILES.forEach(t => {
      gameState.properties[t.id] = {
        owner: null,
        level: 0,
        festivalBoost: false,
        takeoverCount: 0
      };
    });
  });

  it('deducts upgrade cost from visiting Host when upgrading broke AI teammate city', () => {
    const tile = BOARD_TILES.find(t => t.type === 'city' && t.houseCost > 0);
    assert.ok(tile, 'Must find a city tile');

    // AI Teammate owns the city at level 1, with $0 cash
    gameState.properties[tile.id].owner = 1;
    gameState.properties[tile.id].level = 1;
    gameState.players[1].cash = 0;

    const initialHostCash = gameState.players[0].cash;
    gameState.pendingUpgradeTile = tile;
    gameState.players[0].position = tile.id;

    // Host confirms upgrade from modal
    confirmUpgradeFromModal();

    // Verify:
    // 1. City level upgraded from 1 to 2
    assert.equal(gameState.properties[tile.id].level, 2, 'City level should increase to 2');
    // 2. Cost deducted from Host (Player 0)
    assert.equal(gameState.players[0].cash, initialHostCash - tile.houseCost, 'Cost must be deducted from Host');
    // 3. AI Teammate cash remains $0
    assert.equal(gameState.players[1].cash, 0, 'AI teammate cash must remain untouched');
    // 4. ACTION_UPGRADE_CITY broadcast with host playerIdx
    const upgradePkt = broadcastedActions.find(p => p.type === 'ACTION_UPGRADE_CITY');
    assert.ok(upgradePkt, 'ACTION_UPGRADE_CITY must be broadcast');
    assert.equal(upgradePkt.playerIdx, 0, 'playerIdx in broadcast must be Host (0)');
    assert.equal(upgradePkt.count, 1);
  });

  it('supports 2-level upgrade on ally city deducting double cost from Host', () => {
    const tile = BOARD_TILES.find(t => t.type === 'city' && t.houseCost > 0);
    gameState.properties[tile.id].owner = 1;
    gameState.properties[tile.id].level = 1;
    gameState.players[1].cash = 0;

    const initialHostCash = gameState.players[0].cash;
    gameState.pendingUpgradeTile = tile;
    gameState.players[0].position = tile.id;

    confirmUpgradeTwoLevelsFromModal();

    assert.equal(gameState.properties[tile.id].level, 3, 'City level should increase to 3');
    assert.equal(gameState.players[0].cash, initialHostCash - (tile.houseCost * 2), 'Double cost deducted from Host');
    assert.equal(gameState.players[1].cash, 0, 'AI teammate cash remains untouched');

    const upgradePkt = broadcastedActions.find(p => p.type === 'ACTION_UPGRADE_CITY');
    assert.ok(upgradePkt);
    assert.equal(upgradePkt.playerIdx, 0);
    assert.equal(upgradePkt.count, 2);
  });

  it('aborts upgrade without animation or state change if visiting player is broke', () => {
    const tile = BOARD_TILES.find(t => t.type === 'city' && t.houseCost > 0);
    gameState.properties[tile.id].owner = 1;
    gameState.properties[tile.id].level = 1;
    gameState.players[1].cash = 0;
    // Host is broke
    gameState.players[0].cash = 100;

    gameState.pendingUpgradeTile = tile;
    gameState.players[0].position = tile.id;

    confirmUpgradeFromModal();

    // City level must NOT change
    assert.equal(gameState.properties[tile.id].level, 1, 'City level must remain 1');
    assert.equal(gameState.players[0].cash, 100, 'Host cash must remain unchanged');
    assert.equal(gameState.players[1].cash, 0, 'AI cash must remain unchanged');
    assert.equal(gameState.upgradesThisVisit, 0, 'upgradesThisVisit should remain 0');

    // No ACTION_UPGRADE_CITY packet sent
    const upgradePkt = broadcastedActions.find(p => p.type === 'ACTION_UPGRADE_CITY');
    assert.equal(upgradePkt, undefined, 'Must not broadcast ACTION_UPGRADE_CITY on failed upgrade');
  });

  it('renders ally badge and sets isAlly and ownerName in modal state', () => {
    const tile = BOARD_TILES.find(t => t.type === 'city' && t.houseCost > 0);
    gameState.properties[tile.id].owner = 1;
    gameState.properties[tile.id].level = 1;

    renderUpgradeModalContent(tile);

    let modalState = {};
    const unsub = modalStore.subscribe(val => { modalState = val.upgradeCity || {}; });
    unsub();

    assert.equal(modalState.isAlly, true, 'isAlly must be true');
    assert.equal(modalState.ownerName, 'AI Teammate', 'ownerName must match ally');
    assert.equal(modalState.canUpgrade, true, 'Host with money can upgrade');
  });

  it('syncs ACTION_UPGRADE_CITY across P2P guest callback cleanly', () => {
    const tile = BOARD_TILES.find(t => t.type === 'city' && t.houseCost > 0);
    gameState.properties[tile.id].owner = 1;
    gameState.properties[tile.id].level = 1;
    gameState.players[1].cash = 0;

    let receivedUpgrade = null;
    registerNetworkCallbacks({
      onUpgradeCity: (playerIdx, tileId, count) => {
        receivedUpgrade = { playerIdx, tileId, count };
      }
    });

    executeIncomingNetworkAction({
      type: 'ACTION_UPGRADE_CITY',
      playerIdx: 0,
      tileId: tile.id,
      count: 1
    });

    assert.ok(receivedUpgrade, 'Network callback must fire');
    assert.equal(receivedUpgrade.playerIdx, 0, 'Callback must receive Host playerIdx');
    assert.equal(receivedUpgrade.tileId, tile.id);
    assert.equal(receivedUpgrade.count, 1);
  });

  it('allows teammate standing on city to upgrade via buildInspectorSliceData', () => {
    const tile = BOARD_TILES.find(t => t.type === 'city' && t.houseCost > 0);
    gameState.properties[tile.id].owner = 1; // AI Teammate
    gameState.properties[tile.id].level = 1;
    gameState.players[0].position = tile.id;
    gameState.phase = 'ROLL';

    const slice = buildInspectorSliceData(tile.id);
    assert.equal(slice.canUpgrade, true, 'Teammate standing on ally city can upgrade in inspector');
    assert.equal(slice.canDowngrade, false, 'Teammate CANNOT downgrade ally city');
  });
});
