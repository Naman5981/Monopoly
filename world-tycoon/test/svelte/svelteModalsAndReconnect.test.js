import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { modalStore, updateModalSlice, closeAllModalsInStore } from '../../src/svelte/stores/modalStore.js';
import { gameState, resetGameStateForNewMatch, isHumanTurnActionable, setLocalPlayerIdx } from '../../src/game/state.js';
import { networkState } from '../../src/network/p2pState.js';
import { convertRemotePlayersToBots, startGuestReconnectGracePeriod, cancelGuestReconnectGracePeriod } from '../../src/network/p2pReconnect.js';
import { handleRollButtonClick } from '../../src/game/engine/turnCycle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../../src');

describe('Svelte Modals & P2P Reconnect State Freeze (/bug-hunter)', () => {
  beforeEach(() => {
    resetGameStateForNewMatch(2);
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    setLocalPlayerIdx(0);
    networkState.isMultiplayer = true;
    networkState.isHost = false;
    networkState.isReconnecting = false;
    closeAllModalsInStore();
  });

  test('verifies all 4 network/session Svelte modals exist and are mounted in ModalsRoot.svelte', () => {
    const rootPath = path.join(srcDir, 'svelte/modals/ModalsRoot.svelte');
    const content = fs.readFileSync(rootPath, 'utf8');

    assert.ok(content.includes('ResumeMatchModal'), 'ModalsRoot imports ResumeMatchModal');
    assert.ok(content.includes('DisconnectNoticeModal'), 'ModalsRoot imports DisconnectNoticeModal');
    assert.ok(content.includes('ConfirmExitLobbyModal'), 'ModalsRoot imports ConfirmExitLobbyModal');
    assert.ok(content.includes('ReconnectGraceModal'), 'ModalsRoot imports ReconnectGraceModal');

    assert.ok(fs.existsSync(path.join(srcDir, 'svelte/modals/ResumeMatchModal.svelte')));
    assert.ok(fs.existsSync(path.join(srcDir, 'svelte/modals/DisconnectNoticeModal.svelte')));
    assert.ok(fs.existsSync(path.join(srcDir, 'svelte/modals/ConfirmExitLobbyModal.svelte')));
    assert.ok(fs.existsSync(path.join(srcDir, 'svelte/modals/ReconnectGraceModal.svelte')));
  });

  test('updates modalStore reactively for resumeMatch and reconnectGrace', () => {
    let currentStore;
    const unsub = modalStore.subscribe(val => { currentStore = val; });

    updateModalSlice('resumeMatch', {
      visible: true,
      matchTimeFormatted: '04:12',
      currentPlayerName: 'ALICE',
      isMultiplayer: true,
      roomCode: 'GOLD'
    });

    assert.equal(currentStore.resumeMatch.visible, true);
    assert.equal(currentStore.resumeMatch.matchTimeFormatted, '04:12');
    assert.equal(currentStore.resumeMatch.currentPlayerName, 'ALICE');
    assert.equal(currentStore.resumeMatch.roomCode, 'GOLD');

    updateModalSlice('reconnectGrace', {
      visible: true,
      roomCode: 'GOLD',
      secondsRemaining: 27
    });

    assert.equal(currentStore.reconnectGrace.visible, true);
    assert.equal(currentStore.reconnectGrace.secondsRemaining, 27);

    closeAllModalsInStore();
    assert.equal(currentStore.resumeMatch.visible, false);
    assert.equal(currentStore.reconnectGrace.visible, false);

    unsub();
  });

  test('freezes turn actionability and blocks roll when networkState.isReconnecting is true', async () => {
    assert.equal(isHumanTurnActionable(), true, 'Active local player is actionable before disconnect');

    networkState.isReconnecting = true;
    assert.equal(isHumanTurnActionable(), false, 'Actionability immediately frozen when reconnecting');

    let rollExecuted = false;
    const origPhase = gameState.phase;

    await handleRollButtonClick();
    assert.equal(gameState.phase, origPhase, 'Phase remains untouched; roll blocked while reconnecting');

    networkState.isReconnecting = false;
    assert.equal(isHumanTurnActionable(), true, 'Actionability restored when reconnecting ends');
  });

  test('convertRemotePlayersToBots unfreezes state and converts other players to AI', () => {
    networkState.isReconnecting = true;
    gameState.players[0].isAI = false;
    gameState.players[1].isAI = false;

    convertRemotePlayersToBots();

    assert.equal(networkState.isReconnecting, false, 'Reconnecting flag reset to false');
    assert.equal(networkState.isMultiplayer, false, 'Multiplayer mode disabled');
    assert.equal(gameState.players[0].isAI, false, 'Local human remains non-AI');
    assert.equal(gameState.players[1].isAI, true, 'Remote player cleanly converted to autonomous AI');
  });
});
