import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';

setupBrowserMocks();

const { gameState } = await import('../src/game/state.js');
const {
  handleLobbyButtonClick,
  openConfirmExitLobbyModal,
  closeConfirmExitLobbyModal,
  confirmExitToLobbyAction
} = await import('../src/ui/modals/system.js');
const { terminateMatchAndReturnToLobby } = await import('../src/game/engine.js');
const { openLandingSetupScreen } = await import('../src/ui/setup/setupRoom.js');
const {
  setBulbLightingTheme,
  updateStreetLampGlow,
  streetPointLights,
  streetBulbMaterials,
  streetGroundLightPools,
  streetGlowSprites
} = await import('../src/three/core/lighting.js');

test('Return to Lobby & Home Button Lifecycle (/bug-hunter)', async (t) => {
  await t.test('handleLobbyButtonClick opens confirm modal when match is actively running', () => {
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';

    const modal = document.getElementById('modal-confirm-exit-lobby');
    modal.classList.add('hidden');
    modal.classList.remove('flex');

    handleLobbyButtonClick();

    assert.equal(modal.classList.contains('hidden'), false);
    assert.equal(modal.classList.contains('flex'), true);
  });

  await t.test('confirmExitToLobbyAction terminates active match and resets game phase to SETUP', () => {
    gameState.gameStarted = true;
    gameState.phase = 'ROLL';

    confirmExitToLobbyAction();

    assert.equal(gameState.gameStarted, false);
    assert.equal(gameState.phase, 'SETUP');
  });

  await t.test('terminateMatchAndReturnToLobby hides in-game HUD bar, player cards, and dock status', () => {
    gameState.gameStarted = true;

    const hudBar = document.getElementById('main-game-hud-bar');
    const hudLeft = document.getElementById('hud-left-players');
    const hudRight = document.getElementById('hud-right-players');
    const statusWrap = document.getElementById('hud-bottom-status-wrap');

    hudBar.classList.remove('hidden');
    hudLeft.classList.remove('hidden');
    hudRight.classList.remove('hidden');
    statusWrap.classList.remove('hidden');

    terminateMatchAndReturnToLobby();

    assert.equal(hudBar.classList.contains('hidden'), true);
    assert.equal(hudLeft.classList.contains('hidden'), true);
    assert.equal(hudRight.classList.contains('hidden'), true);
    assert.equal(statusWrap.classList.contains('hidden'), true);
    assert.equal(gameState.gameStarted, false);
  });

  await t.test('openLandingSetupScreen reveals landing lobby and ensures HUD bar is strictly hidden', () => {
    const landing = document.getElementById('landing-setup-screen');
    const hudBar = document.getElementById('main-game-hud-bar');
    const hudLeft = document.getElementById('hud-left-players');
    const hudRight = document.getElementById('hud-right-players');

    landing.classList.add('hidden');
    hudBar.classList.remove('hidden');
    hudLeft.classList.remove('hidden');
    hudRight.classList.remove('hidden');

    openLandingSetupScreen();

    assert.equal(landing.classList.contains('hidden'), false);
    assert.equal(hudBar.classList.contains('hidden'), true);
    assert.equal(hudLeft.classList.contains('hidden'), true);
    assert.equal(hudRight.classList.contains('hidden'), true);
  });
});

test('3D Street Lamp Illumination & Daytime Cyber vs Normal Rules (/better-interface)', async (t) => {
  await t.test('setBulbLightingTheme configures intense cyan neon light in Cyberpunk style during day', () => {
    setBulbLightingTheme('day', 'cyberpunk');

    streetBulbMaterials.forEach(mat => {
      assert.equal(mat.emissive.getHex(), 0x00f5ff);
      assert.ok(mat.emissiveIntensity >= 2.0);
      assert.ok(mat.opacity >= 0.90);
    });

    streetGroundLightPools.forEach(mat => {
      assert.equal(mat.visible, true);
      assert.equal(mat.color.getHex(), 0x00f5ff);
      assert.ok(mat.opacity >= 0.40);
    });

    streetPointLights.forEach(pl => {
      assert.equal(pl.visible, true);
      assert.ok(pl.intensity >= 1.5);
    });
  });

  await t.test('setBulbLightingTheme turns OFF streetlights during morning/daytime on normal board (wood)', () => {
    setBulbLightingTheme('day', 'wood');

    streetBulbMaterials.forEach(mat => {
      assert.equal(mat.emissiveIntensity, 0);
      assert.equal(mat.emissive.getHex(), 0x000000);
    });

    streetGroundLightPools.forEach(mat => {
      assert.equal(mat.visible, false);
      assert.equal(mat.opacity, 0);
    });

    streetGlowSprites.forEach(mat => {
      assert.equal(mat.visible, false);
      assert.equal(mat.opacity, 0);
    });

    streetPointLights.forEach(pl => {
      assert.equal(pl.visible, false);
      assert.equal(pl.intensity, 0);
    });
  });

  await t.test('setBulbLightingTheme turns ON streetlights during night mode on normal board (wood)', () => {
    setBulbLightingTheme('night', 'wood');

    streetBulbMaterials.forEach(mat => {
      assert.ok(mat.emissiveIntensity >= 2.0);
      assert.equal(mat.emissive.getHex(), 0xffeedd);
    });

    streetGroundLightPools.forEach(mat => {
      assert.equal(mat.visible, true);
      assert.ok(mat.opacity >= 0.40);
    });

    streetPointLights.forEach(pl => {
      assert.equal(pl.visible, true);
      assert.ok(pl.intensity >= 1.4);
    });
  });

  await t.test('updateStreetLampGlow keeps lights off in morning on normal board, but pulses in night or on cyber board', () => {
    // 1. Morning on normal board: strictly extinguished
    setBulbLightingTheme('day', 'wood');
    updateStreetLampGlow(1.5);

    streetPointLights.forEach(pl => {
      assert.equal(pl.visible, false);
      assert.equal(pl.intensity, 0);
    });
    streetBulbMaterials.forEach(mat => {
      assert.equal(mat.emissiveIntensity, 0);
    });

    // 2. Daytime on cyber board: active neon illumination
    setBulbLightingTheme('day', 'cyberpunk');
    updateStreetLampGlow(1.5);

    streetPointLights.forEach(pl => {
      assert.equal(pl.visible, true);
      assert.ok(pl.intensity > 1.0);
    });

    // 3. Night on normal board: active warm filament illumination
    setBulbLightingTheme('night', 'wood');
    updateStreetLampGlow(2.0);

    streetPointLights.forEach(pl => {
      assert.equal(pl.visible, true);
      assert.ok(pl.intensity > 1.5);
    });
  });
});
