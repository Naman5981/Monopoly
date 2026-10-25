import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';

setupBrowserMocks();

const { gameState, soundEnabled, toggleSoundEnabled } = await import('../src/game/state.js');
const {
  handleLobbyButtonClick,
  openConfirmExitLobbyModal,
  openRulesModal,
  toggleEventLogDrawer
} = await import('../src/ui/modals/system.js');
const { openPortfolioModal } = await import('../src/ui/modals/inspector.js');
const { openTradeModal } = await import('../src/ui/modals/trade.js');
const { toggleDebugPanel } = await import('../src/game/debug/ui.js');
const { handleModalBackdropClick } = await import('../src/ui/modals/common.js');
const { initFastHUDButtonInteractions, updateRollButtonsUI } = await import('../src/ui/hud/controls.js');

describe('HUD Buttons Activation Latency Benchmark (/bug-hunter)', () => {
  before(() => {
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';
    gameState.currentPlayerIdx = 0;
    gameState.players = [
      { id: 'p0', name: 'Naman', cash: 2000000, isAI: false, position: 0 },
      { id: 'p1', name: 'Bot-1', cash: 2000000, isAI: true, position: 0 }
    ];

    const drawer = document.getElementById('event-log-drawer');
    if (drawer) {
      drawer.classList.add('hidden');
      drawer.classList.remove('flex');
    }
  });

  it('measures execution time of handleLobbyButtonClick (< 10ms)', () => {
    const start = performance.now();
    handleLobbyButtonClick();
    const duration = performance.now() - start;
    const modal = document.getElementById('modal-confirm-exit-lobby');
    assert.equal(modal.classList.contains('hidden'), false);
    assert.ok(duration < 10, `Execution took ${duration}ms, must be < 10ms`);
  });

  it('measures execution time of openPortfolioModal (< 10ms)', () => {
    const start = performance.now();
    openPortfolioModal();
    const duration = performance.now() - start;
    const modal = document.getElementById('modal-portfolio');
    assert.equal(modal.classList.contains('hidden'), false);
    assert.ok(duration < 10, `Execution took ${duration}ms, must be < 10ms`);
  });

  it('measures execution time of openTradeModal (< 10ms)', () => {
    const start = performance.now();
    openTradeModal();
    const duration = performance.now() - start;
    const modal = document.getElementById('modal-trade');
    assert.equal(modal.classList.contains('hidden'), false);
    assert.ok(duration < 10, `Execution took ${duration}ms, must be < 10ms`);
  });

  it('measures execution time of openRulesModal (< 10ms)', () => {
    const start = performance.now();
    openRulesModal();
    const duration = performance.now() - start;
    const modal = document.getElementById('modal-rules');
    assert.equal(modal.classList.contains('hidden'), false);
    assert.ok(duration < 10, `Execution took ${duration}ms, must be < 10ms`);
  });

  it('measures execution time of toggleEventLogDrawer (< 10ms)', () => {
    const drawer = document.getElementById('event-log-drawer');
    drawer.classList.add('hidden');
    drawer.classList.remove('flex');

    const start = performance.now();
    toggleEventLogDrawer();
    const duration = performance.now() - start;
    assert.equal(drawer.classList.contains('hidden'), false);
    assert.ok(duration < 10, `Execution took ${duration}ms, must be < 10ms`);
  });

  it('measures execution time of toggleDebugPanel (< 10ms)', () => {
    const start = performance.now();
    toggleDebugPanel(true);
    const duration = performance.now() - start;
    const panel = document.getElementById('debug-suite-panel');
    assert.equal(panel.classList.contains('hidden'), false);
    assert.ok(duration < 10, `Execution took ${duration}ms, must be < 10ms`);
  });

  it('verifies initFastHUDButtonInteractions attaches without errors', () => {
    assert.doesNotThrow(() => {
      initFastHUDButtonInteractions();
    });
  });

  it('ensures Manage Cities and Trade buttons never lock with padlocks during non-actionable turn phases', () => {
    // Simulate non-actionable turn (e.g. AI turn or MOVING phase)
    updateRollButtonsUI(false);

    const btnManage = document.getElementById('btn-manage-cities');
    const iconManage = document.getElementById('icon-manage-cities');
    const btnTrade = document.getElementById('btn-trade');
    const iconTrade = document.getElementById('icon-trade');

    assert.ok(btnManage, 'btn-manage-cities element exists');
    assert.ok(btnTrade, 'btn-trade element exists');

    assert.equal(btnManage.classList.contains('pill-locked'), false, 'btn-manage-cities must not have pill-locked');
    assert.equal(btnTrade.classList.contains('pill-locked'), false, 'btn-trade must not have pill-locked');

    assert.ok(iconManage.className.includes('fa-city'), 'icon-manage-cities must show city icon, not padlock');
    assert.ok(!iconManage.className.includes('fa-lock'), 'icon-manage-cities must NOT show padlock');

    assert.ok(iconTrade.className.includes('fa-handshake'), 'icon-trade must show handshake icon, not padlock');
    assert.ok(!iconTrade.className.includes('fa-lock'), 'icon-trade must NOT show padlock');
  });

  it('toggles audio mute state properly', async () => {
    const mod = await import('../src/game/state.js');
    const initial = mod.soundEnabled;
    mod.toggleSoundEnabled();
    assert.equal(mod.soundEnabled, !initial);
    // Restore
    mod.toggleSoundEnabled();
    assert.equal(mod.soundEnabled, initial);
  });

  it('handleModalBackdropClick protects against ghost dismissal within 300ms of opening', () => {
    const mockBackdrop = { _openedAt: performance.now() };
    let closed = false;
    const closeFn = () => { closed = true; };

    // 1. Ghost release immediately after opening (target === currentTarget, but < 300ms)
    handleModalBackdropClick({ target: mockBackdrop, currentTarget: mockBackdrop }, closeFn);
    assert.equal(closed, false, 'Must not close within 300ms window');

    // 2. Click inside modal card (target !== currentTarget)
    const mockCard = {};
    handleModalBackdropClick({ target: mockCard, currentTarget: mockBackdrop }, closeFn);
    assert.equal(closed, false, 'Must not close when clicking inside card');

    // 3. Genuine user click on backdrop after 300ms
    mockBackdrop._openedAt = performance.now() - 350;
    handleModalBackdropClick({ target: mockBackdrop, currentTarget: mockBackdrop }, closeFn);
    assert.equal(closed, true, 'Must close when clicked after 300ms on backdrop');
  });
});
