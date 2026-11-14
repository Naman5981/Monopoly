/**
 * test/monopolyThreatAlert.test.js
 * Unit tests for Near-Monopoly Threat Detection, Svelte Banners, and Finisher Badges.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { checkNearMonopolyGroup, ownsFullColorGroup } from '../src/game/rules.js';
import { gameState } from '../src/game/state.js';
import { BOARD_TILES } from '../src/game/data.js';
import { bannerStore, triggerBanner, dismissBanner } from '../src/svelte/stores/bannerStore.js';
import { get } from 'svelte/store';

describe('Monopoly Threat Detection & Svelte Alerts (/fixing-motion-performance /web-games)', () => {
  beforeEach(() => {
    // Reset properties state
    gameState.properties = {};
    for (const t of BOARD_TILES) {
      gameState.properties[t.id] = { owner: null, level: 0, festivalBoost: false };
    }
    dismissBanner();
  });

  test('2-City Group (Brown: Cairo & Mumbai): detects threat when 1 of 2 owned', () => {
    // Cairo = 1, Mumbai = 3
    const pIdx = 0;

    // 0 owned
    let check = checkNearMonopolyGroup(pIdx, 'brown');
    assert.equal(check.isNear, false);
    assert.equal(check.missingTile, null);

    // 1 owned (Cairo)
    gameState.properties[1].owner = pIdx;
    check = checkNearMonopolyGroup(pIdx, 'brown');
    assert.equal(check.isNear, true);
    assert.equal(check.missingTile.id, 3); // Mumbai
    assert.equal(check.missingTile.name, 'MUMBAI');
    assert.equal(check.ownedCount, 1);
    assert.equal(check.totalCount, 2);

    // Both owned (Full monopoly -> not near)
    gameState.properties[3].owner = pIdx;
    assert.equal(ownsFullColorGroup(pIdx, 'brown'), true);
    check = checkNearMonopolyGroup(pIdx, 'brown');
    assert.equal(check.isNear, false);
  });

  test('3-City Group (Red: Dubai, Singapore, Hong Kong): detects threat only when 2 of 3 owned', () => {
    // Dubai = 17, Singapore = 19, Hong Kong = 20
    const pIdx = 1;

    // 1 owned (Dubai)
    gameState.properties[17].owner = pIdx;
    let check = checkNearMonopolyGroup(pIdx, 'red');
    assert.equal(check.isNear, false);
    assert.equal(check.ownedCount, 1);
    assert.equal(check.totalCount, 3);

    // 2 owned (Dubai + Singapore) -> Exactly 1 city away!
    gameState.properties[19].owner = pIdx;
    check = checkNearMonopolyGroup(pIdx, 'red');
    assert.equal(check.isNear, true);
    assert.equal(check.missingTile.id, 20); // Hong Kong
    assert.equal(check.missingTile.name, 'HONG KONG');
    assert.equal(check.ownedCount, 2);
    assert.equal(check.totalCount, 3);

    // 3 owned -> Full Monopoly
    gameState.properties[20].owner = pIdx;
    assert.equal(ownsFullColorGroup(pIdx, 'red'), true);
    check = checkNearMonopolyGroup(pIdx, 'red');
    assert.equal(check.isNear, false);
  });

  test('Svelte bannerStore receives and exposes monopolyThreat event banner', () => {
    triggerBanner('monopolyThreat', {
      playerName: 'BARON',
      missingCityName: 'TOKYO',
      groupName: 'Global Supercities',
      missingTileId: 28
    }, 2500);

    const storeVal = get(bannerStore);
    assert.equal(storeVal.activeBanner, 'monopolyThreat');
    assert.equal(storeVal.data.playerName, 'BARON');
    assert.equal(storeVal.data.missingCityName, 'TOKYO');
    assert.equal(storeVal.data.missingTileId, 28);

    dismissBanner();
    const afterDismiss = get(bannerStore);
    assert.equal(afterDismiss.activeBanner, null);
  });
});
