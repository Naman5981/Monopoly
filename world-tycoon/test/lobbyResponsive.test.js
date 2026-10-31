import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { setupBrowserMocks } from './setup.js';

setupBrowserMocks();

const { initLobbyHeroStage, resizeLobbyHeroStage } = await import('../src/three/stages/lobbyStage.js');
const { animateLobbyViewTransition } = await import('../src/ui/anim/lobby.js');
const { assembleIndexHtml } = await import('../tools/assemble-html.js');

test('Lobby Responsive UI & Motion Optimization (/better-interface /fixing-motion-performance /animejs-animation /anti-ui-slop)', async (t) => {
  await t.test('Assembled HTML includes responsive classes for small and large screens', () => {
    const res = assembleIndexHtml();
    assert.ok(res.size > 0, 'index.html must assemble cleanly');

    const html = fs.readFileSync(res.path, 'utf8');

    // Header responsive container
    assert.ok(html.includes('2xl:max-w-[1540px]'), 'Header scales gracefully for 2K/4K displays');

    // Header responsive elements
    assert.ok(html.includes('id="setup-sound-slider"'), 'Sound slider exists in HTML');
    assert.ok(html.includes('hidden sm:inline-block w-14 sm:w-18'), 'Slider is hidden on mobile and revealed on sm+');

    assert.ok(html.includes('id="setup-sound-volume-val"'), 'Sound volume text exists');
    assert.ok(html.includes('hidden sm:inline-block text-[11px] font-black'), 'Sound text is hidden on mobile and revealed on sm+');

    // Responsive hero elements
    assert.ok(html.includes('id="lobby-hero-column"'), 'Hero column exists in HTML');
    assert.ok(html.includes('w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] lg:w-[270px] lg:h-[270px] 2xl:w-[330px] 2xl:h-[330px]'), 'Canvas stage has responsive dimensions across mobile, tablet, desktop, and 2K/4K');

    // Action buttons scaling
    assert.ok(html.includes('py-2.5 sm:py-3 lg:py-3.5 2xl:py-4 px-4 sm:px-5 lg:px-6 2xl:px-7'), 'Primary play buttons scale padding across small, medium, and 4K displays');
  });

  await t.test('3D Lobby Hero Stage initializes and handles resize seamlessly without throwing', () => {
    assert.doesNotThrow(() => {
      initLobbyHeroStage();
      resizeLobbyHeroStage();
    }, 'initLobbyHeroStage and resizeLobbyHeroStage must execute cleanly without exceptions');
  });

  await t.test('animateLobbyViewTransition executes with spring easing without throwing', () => {
    assert.doesNotThrow(() => {
      animateLobbyViewTransition('title');
      animateLobbyViewTransition('local');
      animateLobbyViewTransition('multiplayer-portal');
      animateLobbyViewTransition('multiplayer-room');
    }, 'Lobby view transitions must run smoothly');
  });
});
