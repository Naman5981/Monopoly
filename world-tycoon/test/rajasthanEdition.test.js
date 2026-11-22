import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOARD_TILES,
  CHANCE_WHEEL_PRIZES,
  applyBoardEdition,
  BOARD_EDITIONS
} from '../src/game/data.js';

test('Rajasthan Edition - Data Integrity & Balance Verification', async (t) => {
  await t.test('switches to rajasthan edition correctly', () => {
    applyBoardEdition('rajasthan');
    assert.equal(BOARD_TILES.length, 32);
    assert.equal(CHANCE_WHEEL_PRIZES.length, 6);

    // Verify key landmark tiles
    const startTile = BOARD_TILES[0];
    assert.equal(startTile.type, 'start');
    assert.equal(startTile.name, 'START');

    const desertJail = BOARD_TILES[8];
    assert.equal(desertJail.type, 'island');
    assert.equal(desertJail.name, 'DESERT JAIL');

    const pushkarFair = BOARD_TILES[16];
    assert.equal(pushkarFair.type, 'festival');
    assert.equal(pushkarFair.name, 'PUSHKAR FAIR');

    const royalExpress = BOARD_TILES[24];
    assert.equal(royalExpress.type, 'worldtour');
    assert.equal(royalExpress.name, 'ROYAL EXPRESS');

    const royalTax = BOARD_TILES[29];
    assert.equal(royalTax.type, 'tax');
    assert.equal(royalTax.name, 'ROYAL TAX');
  });

  await t.test('rebalanced city placements match real-world economy', () => {
    applyBoardEdition('rajasthan');

    // Brown set (Tier 1: BHARATPUR, ALWAR)
    assert.equal(BOARD_TILES[1].name, 'BHARATPUR');
    assert.equal(BOARD_TILES[1].price, 120000);
    assert.equal(BOARD_TILES[3].name, 'ALWAR');
    assert.equal(BOARD_TILES[3].price, 140000);

    // Lightblue set (BUNDI, RAWATBHATA, BARMER) + Mount Abu resort
    assert.equal(BOARD_TILES[4].name, 'BUNDI');
    assert.equal(BOARD_TILES[5].name, 'RAWATBHATA');
    assert.equal(BOARD_TILES[6].name, 'BARMER');
    assert.equal(BOARD_TILES[7].name, 'MOUNT ABU');
    assert.equal(BOARD_TILES[7].type, 'resort');

    // Pink set (SIKAR, JHUNJHUNU, PALI - Pali appropriately placed in mid-tier)
    assert.equal(BOARD_TILES[9].name, 'SIKAR');
    assert.equal(BOARD_TILES[10].name, 'JHUNJHUNU');
    assert.equal(BOARD_TILES[11].name, 'PALI');
    assert.equal(BOARD_TILES[11].price, 260000);

    // Orange set (BHILWARA, RANTHAMBORE, CHITTORGARH)
    assert.equal(BOARD_TILES[13].name, 'BHILWARA');
    assert.equal(BOARD_TILES[14].name, 'RANTHAMBORE');
    assert.equal(BOARD_TILES[15].name, 'CHITTORGARH');

    // Red set (KUMBHALGARH, NATHDWARA, BIKANER)
    assert.equal(BOARD_TILES[17].name, 'KUMBHALGARH');
    assert.equal(BOARD_TILES[19].name, 'NATHDWARA');
    assert.equal(BOARD_TILES[20].name, 'BIKANER');

    // Yellow set (KOTA #3 metropolis & AJMER spiritual hub appropriately elevated)
    assert.equal(BOARD_TILES[21].name, 'KOTA');
    assert.equal(BOARD_TILES[21].price, 400000);
    assert.equal(BOARD_TILES[22].name, 'AJMER');
    assert.equal(BOARD_TILES[22].price, 400000);
    assert.equal(BOARD_TILES[23].name, 'JAISALMER');
    assert.equal(BOARD_TILES[23].price, 410000);

    // Green set (NEEMRANA heritage palace, AMER citadel, JODHPUR Blue City #2 metropolis)
    assert.equal(BOARD_TILES[25].name, 'NEEMRANA');
    assert.equal(BOARD_TILES[26].name, 'AMER');
    assert.equal(BOARD_TILES[27].name, 'SAM DUNES');
    assert.equal(BOARD_TILES[27].type, 'resort');
    assert.equal(BOARD_TILES[28].name, 'JODHPUR');
    assert.equal(BOARD_TILES[28].price, 480000);

    // Dark Blue set (UDAIPUR City of Lakes, JAIPUR Pink City capital)
    assert.equal(BOARD_TILES[30].name, 'UDAIPUR');
    assert.equal(BOARD_TILES[30].price, 540000);
    assert.equal(BOARD_TILES[31].name, 'JAIPUR');
    assert.equal(BOARD_TILES[31].price, 600000);
  });

  await t.test('monotonic price progression is strictly maintained', () => {
    applyBoardEdition('rajasthan');
    const cities = BOARD_TILES.filter(t => t.type === 'city');
    assert.equal(cities.length, 22);

    for (let i = 0; i < cities.length - 1; i++) {
      assert.ok(
        cities[i].price <= cities[i + 1].price,
        `City ${cities[i].name} ($${cities[i].price}) should be <= ${cities[i + 1].name} ($${cities[i + 1].price})`
      );
    }
  });

  await t.test('every city and special tile has authentic subtitles', () => {
    applyBoardEdition('rajasthan');
    BOARD_TILES.forEach(tile => {
      assert.ok(tile.subtitle, `Tile #${tile.id} ${tile.name} must have a subtitle`);
      assert.ok(tile.subtitle.trim().length > 3, `Tile #${tile.id} ${tile.name} subtitle too short`);
    });
  });

  await t.test('chance wheel prizes reflect rajasthan cultural theme', () => {
    applyBoardEdition('rajasthan');
    const prizes = CHANCE_WHEEL_PRIZES;
    assert.equal(prizes.length, 6);

    const pushkarPrize = prizes.find(p => p.target === 16);
    assert.ok(pushkarPrize, 'Must have Pushkar Fair Caravan prize for target 16');
    assert.equal(pushkarPrize.icon, '🎪');
    assert.equal(pushkarPrize.label, 'Pushkar Fair!');

    const haveliPrize = prizes.find(p => p.type === 'upgrade');
    assert.ok(haveliPrize, 'Must have Maharaja Architect free Haveli upgrade prize');
    assert.equal(haveliPrize.icon, '🏛️');
    assert.equal(haveliPrize.label, 'Royal Haveli');

    const startPrize = prizes.find(p => p.target === 0);
    assert.ok(startPrize, 'Must have train to START prize');
    assert.equal(startPrize.icon, '🚂');

    const jailPrize = prizes.find(p => p.type === 'island');
    assert.ok(jailPrize, 'Must have desert jail prize');
    assert.equal(jailPrize.icon, '🏜️');
    assert.equal(jailPrize.label, 'Desert Jail');

    const vaultPrize = prizes.find(p => p.type === 'cash');
    assert.ok(vaultPrize, 'Must have Amber Fort Vault cash prize');
    assert.equal(vaultPrize.amount, 400000);

    const cessPrize = prizes.find(p => p.type === 'tax');
    assert.ok(cessPrize, 'Must have Fort Heritage Cess tax prize');
    assert.equal(cessPrize.amount, 200000);
  });

  await t.test('can switch back to world edition seamlessly', () => {
    applyBoardEdition('world');
    assert.equal(BOARD_TILES.length, 32);
    assert.equal(BOARD_TILES[1].name, 'CAIRO');
    assert.equal(BOARD_TILES[8].name, 'ISLAND');
    assert.equal(BOARD_TILES[24].name, 'WORLD TOUR');
    assert.equal(BOARD_TILES[31].name, 'ISTANBUL');
  });
});
