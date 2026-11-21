import test from 'node:test';
import assert from 'node:assert/strict';
import { setupBrowserMocks } from './setup.js';

setupBrowserMocks();

const {
  WARDROBE_ITEMS,
  getTycoonProfile,
  saveTycoonProfile,
  resetTycoonProfile,
  awardMatchPoints,
  awardLiveAchievementStars,
  getMatchLiveAchievements,
  resetMatchLiveAchievements,
  unlockItem,
  equipItem,
  setWardrobeCategory
} = await import('../src/ui/wardrobe.js');

const {
  checkMonopolyBuilt,
  checkSkyscraperBuilt,
  checkHostileBuyout,
  checkMegaRent,
  checkFestivalBoost,
  checkOpponentBankrupted,
  resetMatchAchievements
} = await import('../src/game/achievements.js');

const { sanitizeProfileUpdate, isValidPacket } = await import('../src/network/protocol.js');

test('Wardrobe Overhaul & In-Game Achievement Star Bounties (/game-art /anti-ui-slop)', async (t) => {
  t.beforeEach(() => {
    resetTycoonProfile();
    resetMatchAchievements();
    resetMatchLiveAchievements();
  });

  await t.test('WARDROBE_ITEMS includes buildingSkin and diceTrail categories', () => {
    assert.ok(Array.isArray(WARDROBE_ITEMS.buildingSkin));
    assert.ok(Array.isArray(WARDROBE_ITEMS.diceTrail));

    assert.ok(WARDROBE_ITEMS.buildingSkin.some(b => b.id === 'bldg_classic'));
    assert.ok(WARDROBE_ITEMS.buildingSkin.some(b => b.id === 'bldg_midas'));
    assert.ok(WARDROBE_ITEMS.diceTrail.some(tr => tr.id === 'trail_classic'));
    assert.ok(WARDROBE_ITEMS.diceTrail.some(tr => tr.id === 'trail_fire'));
  });

  await t.test('checkMonopolyBuilt awards +40 stars and records achievement', () => {
    const initialStars = getTycoonProfile().tycoonStars;
    checkMonopolyBuilt(0, 'red', 'Red');

    const profile = getTycoonProfile();
    assert.equal(profile.tycoonStars, initialStars + 40);

    const live = getMatchLiveAchievements();
    assert.equal(live.totalStars, 40);
    assert.ok(live.achievements.some(a => a.id === 'mono_0_red'));
  });

  await t.test('checkSkyscraperBuilt awards +30 stars', () => {
    const initialStars = getTycoonProfile().tycoonStars;
    checkSkyscraperBuilt(0, 'Tokyo');

    const profile = getTycoonProfile();
    assert.equal(profile.tycoonStars, initialStars + 30);
  });

  await t.test('checkHostileBuyout awards +35 stars', () => {
    const initialStars = getTycoonProfile().tycoonStars;
    checkHostileBuyout(0, 'London');

    const profile = getTycoonProfile();
    assert.equal(profile.tycoonStars, initialStars + 35);
  });

  await t.test('checkMegaRent awards +25 stars for rent >= $150k and ignores small rent', () => {
    const initialStars = getTycoonProfile().tycoonStars;
    checkMegaRent(0, 50000, 'Paris'); // Ignored (< $150k)
    assert.equal(getTycoonProfile().tycoonStars, initialStars);

    checkMegaRent(0, 180000, 'Paris'); // Eligible (>= $150k)
    assert.equal(getTycoonProfile().tycoonStars, initialStars + 25);
  });

  await t.test('checkFestivalBoost awards +25 stars', () => {
    const initialStars = getTycoonProfile().tycoonStars;
    checkFestivalBoost(0, 'Rio');

    const profile = getTycoonProfile();
    assert.equal(profile.tycoonStars, initialStars + 25);
  });

  await t.test('checkOpponentBankrupted awards +60 stars', () => {
    const initialStars = getTycoonProfile().tycoonStars;
    checkOpponentBankrupted(0, 'BARON');

    const profile = getTycoonProfile();
    assert.equal(profile.tycoonStars, initialStars + 60);
  });

  await t.test('awardMatchPoints includes live feats in scorecard without double-awarding wallet', () => {
    // 1. Earn in-game live stars
    checkMonopolyBuilt(0, 'darkBlue', 'Mayfair'); // +40 ⭐

    const midMatchStars = getTycoonProfile().tycoonStars;

    // 2. Conclude match
    const summary = awardMatchPoints({ isWinner: true, propertiesOwned: 4, monopoliesCount: 1 });

    assert.ok(summary.breakdown.some(b => b.label === 'Live In-Game Feats' && b.pts === 40));
    assert.ok(summary.breakdown.some(b => b.label === 'Match Victory' && b.pts === 140));

    // Final balance should be midMatchStars + base match victory & properties (140 + 16 + 20)
    assert.equal(getTycoonProfile().tycoonStars, midMatchStars + 140 + 16 + 20);
  });

  await t.test('pure star economy: unlockItem and equipItem handle buildingSkin and diceTrail', () => {
    const profile = getTycoonProfile();
    profile.tycoonStars = 2000; // Give stars
    saveTycoonProfile(profile);

    unlockItem('bldg_artdeco'); // 450 ⭐
    assert.ok(getTycoonProfile().unlockedItems.includes('bldg_artdeco'));

    equipItem('buildingSkin', 'bldg_artdeco');
    assert.equal(getTycoonProfile().equipped.buildingSkin, 'bldg_artdeco');

    unlockItem('trail_fire'); // 400 ⭐
    assert.ok(getTycoonProfile().unlockedItems.includes('trail_fire'));

    equipItem('diceTrail', 'trail_fire');
    assert.equal(getTycoonProfile().equipped.diceTrail, 'trail_fire');
  });

  await t.test('protocol validation: sanitizeProfileUpdate and ACTION_STAR_BOUNTY packet parity', () => {
    const sanitized = sanitizeProfileUpdate({
      name: 'NAMAN',
      buildingSkin: 'bldg_midas',
      diceTrail: 'trail_gold'
    });
    assert.equal(sanitized.buildingSkin, 'bldg_midas');
    assert.equal(sanitized.diceTrail, 'trail_gold');

    assert.equal(isValidPacket({ type: 'ACTION_STAR_BOUNTY', stars: 40 }), true);
  });
});
