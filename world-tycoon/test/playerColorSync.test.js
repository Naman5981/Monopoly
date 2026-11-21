import test from 'node:test';
import assert from 'node:assert/strict';
import { matchSettings, resetGameStateForNewMatch, gameState } from '../src/game/state.js';
import { setPlayerColor, setLocalPlayerColor } from '../src/ui/setup/playerCustomization.js';
import { createDetailed3DAvatarMesh } from '../src/three/assets/avatars.js';

test('Player Color Selection & 3D Material Sync (/bug-hunter /game-art)', async (t) => {
  await t.test('setPlayerColor parses hex to charColor numeric integer when charColor omitted', () => {
    matchSettings.teamMode = false;
    const success = setPlayerColor(0, '#ef4444');
    assert.ok(success, 'Setting player 0 color must succeed');
    assert.equal(matchSettings.customPlayers[0].colorHex, '#ef4444');
    assert.equal(matchSettings.customPlayers[0].charColor, 0xef4444);
  });

  await t.test('setLocalPlayerColor parses hex and preserves charColor for lobby preview', () => {
    matchSettings.teamMode = false;
    const success = setLocalPlayerColor('#8b5cf6');
    assert.ok(success, 'setLocalPlayerColor must succeed');
    assert.equal(matchSettings.customPlayers[0].colorHex, '#8b5cf6');
    assert.equal(matchSettings.customPlayers[0].charColor, 0x8b5cf6);
  });

  await t.test('resetGameStateForNewMatch copies exact custom player color into gameState.players', () => {
    matchSettings.teamMode = false;
    setPlayerColor(0, '#22c55e');
    resetGameStateForNewMatch(4);
    assert.equal(gameState.players[0].colorHex, '#22c55e');
    assert.equal(gameState.players[0].charColor, 0x22c55e);
  });

  await t.test('createDetailed3DAvatarMesh applies exact chosen color to suit material (not white)', () => {
    matchSettings.teamMode = false;
    setPlayerColor(0, '#ef4444');
    resetGameStateForNewMatch(4);

    const pawnMesh = createDetailed3DAvatarMesh(0, false);
    assert.ok(pawnMesh, 'Mesh must be created');
    assert.ok(pawnMesh.userData?.suitMat, 'Pawn must contain suitMat in userData');
    
    // Check Three.js material color is 0xef4444 (not default white 0xffffff)
    const suitColHex = pawnMesh.userData.suitMat.color.getHex();
    assert.equal(suitColHex, 0xef4444, 'Suit material color must match selected #ef4444');
  });
});
