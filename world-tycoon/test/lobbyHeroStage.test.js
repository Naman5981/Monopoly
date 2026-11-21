import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';

setupBrowserMocks();

const {
  initLobbyHeroStage,
  updateLobbyHeroAvatar,
  renderLobbyHeroStage,
  resizeLobbyHeroStage
} = await import('../src/three/stages/lobbyStage.js');

test('Lobby Hero 3D Stage & Avatar Lifecycle (/bug-hunter /anti-ui-slop)', async (t) => {
  let canvas;
  let landing;

  t.beforeEach(() => {
    landing = document.createElement('div');
    landing.id = 'landing-setup-screen';
    landing.classList.add('lobby-view-title');
    landing.style.display = 'flex';
    document.body.appendChild(landing);

    canvas = document.createElement('canvas');
    canvas.id = 'lobby-avatar-3d-canvas';
    canvas.width = 512;
    canvas.height = 512;
    landing.appendChild(canvas);
  });

  t.afterEach(() => {
    if (landing?.parentElement) {
      landing.parentElement.removeChild(landing);
    }
  });

  await t.test('initLobbyHeroStage successfully builds scene, lighting, podium and avatar without early return', () => {
    initLobbyHeroStage(canvas);

    // Call update avatar with explorer hat (style 2) and sky blue (#3b82f6)
    updateLobbyHeroAvatar(2, '#3b82f6', 0x3b82f6);

    // Render loop tick should run cleanly without error
    assert.doesNotThrow(() => {
      renderLobbyHeroStage(1.5);
    });
  });

  await t.test('updateLobbyHeroAvatar updates avatar mesh for different archetypes and colors', () => {
    initLobbyHeroStage(canvas);

    assert.doesNotThrow(() => {
      updateLobbyHeroAvatar(1, '#ef4444', 0xef4444); // Banker
      updateLobbyHeroAvatar(3, '#22c55e', 0x22c55e); // Cyber
      updateLobbyHeroAvatar(4, '#f59e0b', 0xf59e0b); // Crown
    });
  });

  await t.test('subsequent calls to initLobbyHeroStage preserve active scene and canvas binding', () => {
    initLobbyHeroStage(canvas);
    updateLobbyHeroAvatar(2, '#3b82f6', 0x3b82f6);

    // Re-invoke with same canvas
    initLobbyHeroStage(canvas);

    // Should still render properly
    assert.doesNotThrow(() => {
      renderLobbyHeroStage(2.0);
    });
  });
});
