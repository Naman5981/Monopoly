import test from 'node:test';
import assert from 'node:assert/strict';

test.beforeEach(() => {
  if (typeof globalThis.requestAnimationFrame === 'undefined') {
    globalThis.requestAnimationFrame = () => 1;
  }
  if (typeof globalThis.cancelAnimationFrame === 'undefined') {
    globalThis.cancelAnimationFrame = () => {};
  }
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
      innerWidth: 1024,
      innerHeight: 768,
      addEventListener: () => {},
      removeEventListener: () => {},
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => {}
    };
  }
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      getElementById: () => null,
      createElement: () => ({
        style: {},
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        appendChild() {},
        remove() {}
      }),
      body: { appendChild() {} }
    };
  }
});

test('Monopoly Alert Zero-Spin Camera & Chance Option 1 Suite (/game-art /better-interface /anti-ui-slop)', async (t) => {
  const { playMonopolyThreatCinematic } = await import('../src/three/theatre.js');
  const { cameraState } = await import('../src/three/core/camera.js');
  const { context } = await import('../src/three/core/context.js');
  const { BOARD_TILES } = await import('../src/game/data.js');
  const fs = await import('node:fs');
  const path = await import('node:path');

  await t.test('playMonopolyThreatCinematic glides smoothly to tile without rotating board azimuth', async () => {
    context.camera = { position: { set: () => {} }, lookAt: () => {}, updateProjectionMatrix: () => {} };
    cameraState.targetCameraTarget.set(0, 0, 0);
    cameraState.targetCameraZoom = 1.0;
    const initialAzimuth = Math.PI / 4;
    cameraState.targetCameraAzimuth = initialAzimuth;

    const targetTileId = 5; // Cairo
    const promise = playMonopolyThreatCinematic(targetTileId, 50);

    // Verify camera zoom is gentle and smooth (~1.48x)
    assert.equal(cameraState.targetCameraZoom, 1.48);

    // Verify board azimuth has NOT rotated (zero board spin!)
    assert.equal(cameraState.targetCameraAzimuth, initialAzimuth, 'Board azimuth must stay locked to current view angle');

    // Verify camera target glided to property position
    assert.notEqual(cameraState.targetCameraTarget.x, 0);
    assert.notEqual(cameraState.targetCameraTarget.z, 0);

    await promise;

    // Verify camera returned smoothly to center
    assert.equal(cameraState.targetCameraTarget.x, 0);
    assert.equal(cameraState.targetCameraTarget.z, 0);
    assert.equal(cameraState.targetCameraZoom, 1.0);
    assert.equal(cameraState.targetCameraAzimuth, initialAzimuth);

    context.camera = null;
  });

  await t.test('ChanceWheelModal implements Option 1 with zero fullscreen blur', () => {
    const sveltePath = fs.existsSync('src/svelte/modals/ChanceWheelModal.svelte')
      ? path.resolve('src/svelte/modals/ChanceWheelModal.svelte')
      : path.resolve('world-tycoon/src/svelte/modals/ChanceWheelModal.svelte');
    const content = fs.readFileSync(sveltePath, 'utf8');

    // Must NOT have backdrop-blur on fullscreen modal container
    assert.ok(content.includes('backdrop-blur-none'), 'Fullscreen container must use backdrop-blur-none');
    assert.ok(!content.includes('bg-slate-950/80 backdrop-blur-md'), 'Must not have dark heavy 80% blur blanket');

    // Must have crisp high-contrast border on the circular dial canvas
    assert.ok(content.includes('border-4 border-amber-400/90') || content.includes('border-amber-400'), 'Wheel has crisp high-contrast golden border');
  });
});
