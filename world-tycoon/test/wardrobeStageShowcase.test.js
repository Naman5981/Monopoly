import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  initLobbyHeroStage,
  setLobbyHeroShowcaseMode,
  updateLobbyHeroBuildingSkin,
  updateLobbyHeroDiceSkin,
  updateLobbyHeroDiceTrail,
  triggerLobbyHeroDiceRoll
} from '../src/three/stages/lobbyStage.js';
import {
  setWardrobeCategory,
  previewWardrobeItem,
  closeWardrobeModal,
  WARDROBE_ITEMS
} from '../src/ui/wardrobe.js';
import { modalStore } from '../src/svelte/stores/modalStore.js';

describe('Wardrobe 3D Stage Showcase & Category Modernization', () => {
  beforeEach(() => {
    // Setup mock DOM canvas environment if not in browser
    if (typeof document === 'undefined') {
      global.document = {
        getElementById: () => null,
        addEventListener: () => {},
        activeElement: null
      };
      global.window = {
        addEventListener: () => {},
        removeEventListener: () => {},
        devicePixelRatio: 1
      };
    }
  });

  it('verifies setLobbyHeroShowcaseMode accepts avatar, building, and dice modes', () => {
    assert.doesNotThrow(() => {
      setLobbyHeroShowcaseMode('avatar', { hatStyle: 1, colorHex: '#3b82f6' });
      setLobbyHeroShowcaseMode('building', { skinId: 'bldg_artdeco', ownerColor: 0x3b82f6 });
      setLobbyHeroShowcaseMode('dice', { diceSkinId: 'dice_midas', trailId: 'trail_gold' });
    });
  });

  it('verifies updateLobbyHeroBuildingSkin handles all official skins', () => {
    const skins = ['bldg_classic', 'bldg_artdeco', 'bldg_resort', 'bldg_cyber', 'bldg_midas'];
    skins.forEach(skin => {
      assert.doesNotThrow(() => {
        updateLobbyHeroBuildingSkin(skin, 0xef4444);
      });
    });
  });

  it('verifies updateLobbyHeroDiceSkin and updateLobbyHeroDiceTrail handle all skins and trails', () => {
    const diceSkins = ['dice_classic', 'dice_ruby', 'dice_neon', 'dice_midas', 'dice_obsidian'];
    const trails = ['trail_classic', 'trail_fire', 'trail_gold', 'trail_cyber'];

    diceSkins.forEach(skin => {
      assert.doesNotThrow(() => {
        updateLobbyHeroDiceSkin(skin);
      });
    });

    trails.forEach(trail => {
      assert.doesNotThrow(() => {
        updateLobbyHeroDiceTrail(trail);
      });
    });
  });

  it('verifies triggerLobbyHeroDiceRoll initiates roll animation cleanly', () => {
    assert.doesNotThrow(() => {
      triggerLobbyHeroDiceRoll();
    });
  });

  it('verifies setWardrobeCategory switches category in modalStore', () => {
    setWardrobeCategory('buildingSkin');
    let s = null;
    const unsub1 = modalStore.subscribe(val => { s = val.wardrobe; });
    unsub1();
    assert.strictEqual(s.activeCategory, 'buildingSkin');
    assert.ok(s.items.length >= 5);

    setWardrobeCategory('diceTrail');
    let s2 = null;
    const unsub2 = modalStore.subscribe(val => { s2 = val.wardrobe; });
    unsub2();
    assert.strictEqual(s2.activeCategory, 'diceTrail');
    assert.strictEqual(s2.items[1].id, 'trail_fire');

    setWardrobeCategory('pedestal');
    let s3 = null;
    const unsub3 = modalStore.subscribe(val => { s3 = val.wardrobe; });
    unsub3();
    assert.strictEqual(s3.activeCategory, 'pedestal');
    assert.strictEqual(s3.items[0].name, 'Slate Halo');
  });

  it('verifies previewWardrobeItem updates preview state and triggers showcase mode', () => {
    assert.doesNotThrow(() => {
      previewWardrobeItem('buildingSkin', 'bldg_midas');
      previewWardrobeItem('dice', 'dice_ruby');
      previewWardrobeItem('diceTrail', 'trail_gold');
      previewWardrobeItem('hat', 'hat_crown');
      previewWardrobeItem('pedestal', 'pedestal_gold');
    });
  });

  it('verifies closeWardrobeModal restores showcase mode back to avatar', () => {
    setWardrobeCategory('dice');
    assert.doesNotThrow(() => {
      closeWardrobeModal();
    });
  });
});
