import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from '../setup.js';
setupBrowserMocks();

import { BUILD_CONFIG } from '../../src/game/buildConfig.js';
import { initDebugSuite } from '../../src/game/debug.js';

describe('Debug Mode & CI Build Policy', () => {
  let originalDebugEnabled;
  let mockButton1;
  let mockButton2;

  beforeEach(() => {
    originalDebugEnabled = BUILD_CONFIG.DEBUG_ENABLED;

    // Create mock DOM buttons
    mockButton1 = document.createElement('button');
    mockButton1.setAttribute('data-debug-ui', 'true');
    mockButton1.setAttribute('onclick', 'window.toggleDebugPanel()');
    document.body.appendChild(mockButton1);

    mockButton2 = document.createElement('button');
    mockButton2.setAttribute('data-debug-ui', 'true');
    document.body.appendChild(mockButton2);
  });

  afterEach(() => {
    BUILD_CONFIG.DEBUG_ENABLED = originalDebugEnabled;
    mockButton1?.remove();
    mockButton2?.remove();
    delete window.debug;
    delete window.WorldTycoonDebug;
  });

  it('defaults to DEBUG_ENABLED = true for local developer PC', () => {
    assert.equal(BUILD_CONFIG.DEBUG_ENABLED, true);
  });

  it('completely strips and deactivates debug suite when DEBUG_ENABLED = false (Production/CI build)', () => {
    BUILD_CONFIG.DEBUG_ENABLED = false;

    initDebugSuite();

    // Verify console debug object is not exposed
    assert.equal(window.debug, undefined);
    assert.equal(window.WorldTycoonDebug, undefined);

    // Verify toggleDebugPanel is a safe no-op
    assert.equal(typeof window.toggleDebugPanel, 'function');
    assert.doesNotThrow(() => window.toggleDebugPanel());

    // Verify DOM debug trigger buttons were removed
    const remainingDebugBtns = document.querySelectorAll('[data-debug-ui]');
    assert.equal(remainingDebugBtns.length, 0);
  });

  it('initializes debug suite normally when DEBUG_ENABLED = true (Local PC)', () => {
    BUILD_CONFIG.DEBUG_ENABLED = true;

    initDebugSuite();

    // Verify debug suite is active
    assert.equal(typeof window.debug, 'object');
    assert.equal(typeof window.debug.roll, 'function');
    assert.equal(typeof window.debug.teleport, 'function');
    assert.equal(typeof window.toggleDebugPanel, 'function');
  });
});
