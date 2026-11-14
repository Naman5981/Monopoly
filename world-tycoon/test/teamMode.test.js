/**
 * test/teamMode.test.js
 * Unit test suite for 2v2 / 3v3 Team Mode mechanics in World Tycoon:
 * - Teammate detection
 * - Combined team net worth calculation
 * - Teammate $0 rent immunity
 * - Shared team color group monopolies
 * - Quad Monopoly (4 sets) victory trigger
 * - 5-player 3v3 auto-balance logic
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { gameState, matchSettings, resetGameStateForNewMatch } from '../src/game/state.js';
import {
  isTeammate,
  getTeamMembers,
  calculateTeamNetWorth,
  calculateTileRent,
  ownsFullColorGroup,
  checkVictoryConditions,
  validateTeamModeBalance
} from '../src/game/rules.js';
import { BOARD_TILES, GROUP_META } from '../src/game/data.js';

describe('Team Mode Engine & Rules', () => {
  beforeEach(() => {
    matchSettings.teamMode = true;
    matchSettings.monopolySetsToWin = 4;
    matchSettings.customPlayers = [
      { name: 'P1', isAI: false, teamId: 0 },
      { name: 'P2', isAI: true,  teamId: 1 },
      { name: 'P3', isAI: false, teamId: 0 },
      { name: 'P4', isAI: true,  teamId: 1 }
    ];
    resetGameStateForNewMatch(4);
  });

  it('correctly distinguishes teammates vs opponents', () => {
    // P1 (team 0) and P3 (team 0) are teammates
    assert.equal(isTeammate(0, 2), true);
    assert.equal(isTeammate(2, 0), true);

    // P1 (team 0) and P2 (team 1) are enemies
    assert.equal(isTeammate(0, 1), false);
    assert.equal(isTeammate(2, 3), false);

    // Self comparison is false
    assert.equal(isTeammate(0, 0), false);
  });

  it('aggregates team members and combined team net worth', () => {
    const t0Members = getTeamMembers(0);
    const t1Members = getTeamMembers(1);

    assert.deepEqual(t0Members, [0, 2]);
    assert.deepEqual(t1Members, [1, 3]);

    // Initial cash 2,000,000 each -> 4,000,000 per team
    assert.equal(calculateTeamNetWorth(0), 4000000);
    assert.equal(calculateTeamNetWorth(1), 4000000);

    // Give P1 a property
    const cityTile = BOARD_TILES.find(t => t.type === 'city');
    gameState.properties[cityTile.id] = { owner: 0, level: 2 };
    
    // Team 0 net worth increases by property base price + building cost
    assert.ok(calculateTeamNetWorth(0) > 4000000);
  });

  it('grants $0 rent immunity when landing on partner property', () => {
    const cityTile = BOARD_TILES.find(t => t.type === 'city');
    gameState.properties[cityTile.id] = { owner: 2, level: 1 }; // Owned by P3 (Team 0)

    // P1 (Team 0) pays $0 rent
    const partnerRent = calculateTileRent(cityTile.id, 0);
    assert.equal(partnerRent, 0);

    // P2 (Team 1) pays standard rent (> 0)
    const enemyRent = calculateTileRent(cityTile.id, 1);
    assert.ok(enemyRent > 0);
  });

  it('recognizes shared color group monopolies across teammates', () => {
    // Find a group with 2 or 3 tiles (e.g. brown or cyan)
    const groupKey = Object.keys(GROUP_META)[0];
    const groupTileIds = BOARD_TILES.filter(t => t.group === groupKey).map(t => t.id);
    assert.ok(groupTileIds.length >= 2);

    // P1 owns first tile, P3 owns second tile
    gameState.properties[groupTileIds[0]] = { owner: 0, level: 1 };
    gameState.properties[groupTileIds[1]] = { owner: 2, level: 1 };
    if (groupTileIds[2]) {
      gameState.properties[groupTileIds[2]] = { owner: 0, level: 1 };
    }

    // In Team Mode, both P1 and P3 own the full group together
    assert.equal(ownsFullColorGroup(0, groupKey), true);
    assert.equal(ownsFullColorGroup(2, groupKey), true);

    // Opponent does not own the group
    assert.equal(ownsFullColorGroup(1, groupKey), false);
  });

  it('triggers Quad Monopoly victory when team controls 4 full color groups', () => {
    const groupKeys = Object.keys(GROUP_META).slice(0, 4);
    assert.equal(groupKeys.length, 4);

    // Give Team 0 (P1 and P3) 4 full color groups
    groupKeys.forEach((gk, idx) => {
      const tileIds = BOARD_TILES.filter(t => t.group === gk).map(t => t.id);
      tileIds.forEach(tId => {
        // Distribute between P1 and P3
        const owner = (idx % 2 === 0) ? 0 : 2;
        gameState.properties[tId] = { owner, level: 1 };
      });
    });

    const victory = checkVictoryConditions();
    assert.ok(victory, 'Victory condition should be met');
    assert.equal(victory.isTeamVictory, true);
    assert.equal(victory.teamId, 0);
    assert.equal(victory.type, 'quad_monopoly');
    assert.deepEqual(victory.teamMembers.map(m => m.id), [0, 2]);
  });

  it('strictly respects player count when resetting match without adding ghost bots', () => {
    matchSettings.customPlayers = [
      { name: 'P1', isAI: false, teamId: 0 },
      { name: 'P2', isAI: false, teamId: 0 },
      { name: 'P3', isAI: false, teamId: 0 },
      { name: 'P4', isAI: false, teamId: 1 },
      { name: 'P5', isAI: false, teamId: 1 }
    ];

    resetGameStateForNewMatch(5);

    // Strictly 5 players initialized - NO secret 6th bot added!
    assert.equal(gameState.players.length, 5);
  });

  it('rejects unbalanced team distributions before game can start', () => {
    // 5 players on Team 0, 1 on Team 1 (6-player match) -> REJECTED
    const sixPlayersUnbalanced = [
      { teamId: 0 }, { teamId: 0 }, { teamId: 0 }, { teamId: 0 }, { teamId: 0 }, { teamId: 1 }
    ];
    const res6p = validateTeamModeBalance(6, sixPlayersUnbalanced);
    assert.equal(res6p.valid, false);
    assert.match(res6p.error, /Teams must be balanced \(3 vs 3\)/);

    // 5-player match in Team Mode -> REJECTED (odd count cannot be balanced)
    const fivePlayers = [
      { teamId: 0 }, { teamId: 0 }, { teamId: 0 }, { teamId: 1 }, { teamId: 1 }
    ];
    const res5p = validateTeamModeBalance(5, fivePlayers);
    assert.equal(res5p.valid, false);
    assert.match(res5p.error, /Team Mode requires 4 players \(2 vs 2\) or 6 players \(3 vs 3\)/);

    // 3 players on Team 0, 1 on Team 1 (4-player match) -> REJECTED
    const fourPlayers3v1 = [
      { teamId: 0 }, { teamId: 0 }, { teamId: 0 }, { teamId: 1 }
    ];
    const res4p3v1 = validateTeamModeBalance(4, fourPlayers3v1);
    assert.equal(res4p3v1.valid, false);
    assert.match(res4p3v1.error, /Teams must be balanced \(2 vs 2\)/);

    // Less than 4 players -> REJECTED
    const twoPlayers = [{ teamId: 0 }, { teamId: 1 }];
    const res2p = validateTeamModeBalance(2, twoPlayers);
    assert.equal(res2p.valid, false);
    assert.match(res2p.error, /requires at least 4 players/);

    // Valid 2v2 (4 players) -> ACCEPTED
    const valid4p = [{ teamId: 0 }, { teamId: 0 }, { teamId: 1 }, { teamId: 1 }];
    assert.equal(validateTeamModeBalance(4, valid4p).valid, true);

    // Valid 3v3 (6 players) -> ACCEPTED
    const valid6p = [
      { teamId: 0 }, { teamId: 0 }, { teamId: 0 },
      { teamId: 1 }, { teamId: 1 }, { teamId: 1 }
    ];
    assert.equal(validateTeamModeBalance(6, valid6p).valid, true);
  });
});
