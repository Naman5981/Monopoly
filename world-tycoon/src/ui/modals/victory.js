/**
 * ui/modals/victory.js
 * Victory screen celebration, play again rematch logic, return to lobby, and color-group monopoly celebrations.
 */

import { BOARD_TILES, GROUP_META } from '../../game/data.js';
import { gameState, localPlayerIdx, matchSettings } from '../../game/state.js';
import { fmtMoney } from '../../game/utils.js';
import { playSFX, stopAdaptiveMusic } from '../../game/audio.js';
import { ownsFullColorGroup } from '../../game/rules.js';
import { networkState, broadcastAction, broadcastReturnToLobby, broadcastStartOnlineMatch } from '../../network/p2p.js';
import { setMonopolyTileHighlights } from '../../three/scene.js';
import { fireConfettiBurst, spawnAnimatedReaction, startVictoryCelebration, stopVictoryCelebration } from '../../three/effects.js';
import { logEvent } from '../hud.js';
import { buildNetWorthChartData } from './leaderboard.js';
import { engineCallbacks, closeAllGameModals, isLobbyScreenActive } from './common.js';
import { ARCHETYPES } from '../setup.js';
import { awardMatchPoints } from '../wardrobe.js';
import { animateModalPunchIn, animateMonopolyRibbonUnfurl } from '../anim.js';
import { playVictoryCinematicOrbit, playIntroCinematicFlyIn } from '../../three/theatre.js';
import { setPlayerPortraitMood } from '../portraitRenderer.js';
import { get } from 'svelte/store';
import { modalStore, updateModalSlice } from '../../svelte/stores/modalStore.js';

let monopolyCloseTimer = null;

function modalIsVisible(modalKey) {
  return Boolean(get(modalStore)[modalKey]?.visible);
}

/* ─────────────────────────────────────────────────────────────────────────────
   VICTORY CELEBRATION MODAL
───────────────────────────────────────────────────────────────────────────── */
export function showVictoryModal(winner, victoryDetails = null) {
  if (gameState.phase === 'VICTORY' && modalIsVisible('victory')) return;

  // Set phase to VICTORY to immediately freeze turn timer, dice rolls, and AI action loops
  gameState.phase = 'VICTORY';
  stopAdaptiveMusic();

  // Cancel all pending timers (AI rolls, auto-end turn, etc.)
  if (typeof window.cancelAllGameTimers === 'function') {
    window.cancelAllGameTimers();
  }

  // Ensure lobby screen is hidden so victory dialog box is unconditionally visible
  const landingScreen = document.getElementById('landing-setup-screen');
  if (landingScreen) {
    landingScreen.classList.add('hidden');
    landingScreen.style.display = 'none';
    landingScreen.style.opacity = '0';
  }

  updateModalSlice('monopolyCelebration', { visible: false });

  updateModalSlice('victory', { visible: true });
  animateModalPunchIn('#victory-card');

  const winnerObj = winner || (gameState.players && gameState.players.find(p => !p.bankrupt)) || (gameState.players && gameState.players[0]) || { id: 0, name: 'Player 1', cash: 5000000 };
  const winnerIndex = winnerObj.id !== undefined ? winnerObj.id : (gameState.players ? gameState.players.indexOf(winnerObj) : 0);
  const myLocalIdx = networkState.isMultiplayer ? networkState.localPlayerIdx : (typeof localPlayerIdx === 'number' ? localPlayerIdx : 0);
  const isLocalHuman = (winnerIndex === myLocalIdx) && !winnerObj.isAI;

  const titleByVictoryType = {
    triple_monopoly: isLocalHuman ? 'TRIPLE MONOPOLY!' : `${winnerObj.name || 'Player'} TRIPLE WIN!`,
    line_monopoly: isLocalHuman ? 'LINE MONOPOLY!' : `${winnerObj.name || 'Player'} LINE WIN!`,
    net_worth_time: isLocalHuman ? 'RICHEST TYCOON!' : `${winnerObj.name || 'Player'} WON!`
  };
  const winnerPropertyCount = BOARD_TILES.filter(tile => gameState.properties[tile.id]?.owner === winnerIndex).length;
  const accoladeIcons = { triple_monopoly: '🏙️', line_monopoly: '🌎', net_worth_time: '💰' };
  updateModalSlice('victory', {
    visible: true,
    title: titleByVictoryType[victoryDetails?.type] || (isLocalHuman ? 'YOU WON!' : `${winnerObj.name || 'Player'} WON!`),
    subtitle: victoryDetails?.title || (isLocalHuman ? 'Supreme World Real Estate Tycoon' : 'Master of the Global Board'),
    accoladeTitle: victoryDetails?.title || 'GLOBAL TYCOON SUPREMACY!',
    accoladeDesc: victoryDetails?.desc || 'All rival tycoons bankrupted. You rule the entire global real estate empire!',
    accoladeIcon: accoladeIcons[victoryDetails?.type] || '👑',
    finalCashFormatted: fmtMoney(winnerObj.cash || 0),
    empireCitiesCount: `${winnerPropertyCount} Cities`,
    multiplayerStatus: '',
    playAgainText: 'PLAY AGAIN',
    playAgainDisabled: false
  });

  // Calculate and award Tycoon Stars for match completion
  try {
    const humanPlayer = gameState.players?.find(p => !p.isAI) || gameState.players?.[0];
    const humanIdx = humanPlayer ? (humanPlayer.id !== undefined ? humanPlayer.id : gameState.players.indexOf(humanPlayer)) : 0;
    const isHumanWinner = winnerObj && (winnerObj.id === humanIdx || winnerObj === humanPlayer);

    let humanOwnedCities = 0;
    let humanMonopolies = 0;
    if (humanPlayer && gameState.properties) {
      humanOwnedCities = BOARD_TILES.filter(t => gameState.properties[t.id]?.owner === humanIdx).length;
      const checkedGroups = new Set();
      BOARD_TILES.forEach(t => {
        if (t.type === 'city' && t.group && !checkedGroups.has(t.group)) {
          checkedGroups.add(t.group);
          if (ownsFullColorGroup(humanIdx, t.group)) {
            humanMonopolies++;
          }
        }
      });
    }

    const rewardResult = awardMatchPoints({
      isWinner: isHumanWinner,
      propertiesOwned: humanOwnedCities,
      monopoliesCount: humanMonopolies
    });

    updateModalSlice('victory', {
      starsEarned: `+${rewardResult.totalEarned.toLocaleString()} ⭐`,
      totalBalanceStars: `${rewardResult.newBalance.toLocaleString()} ⭐`,
      rewardBreakdown: rewardResult.breakdown
    });
  } catch (err) {
    console.warn('Failed to calculate victory rewards:', err);
  }

  try {
    updateModalSlice('victory', { historyChart: buildNetWorthChartData() });
  } catch (chartErr) {
    console.warn('[Victory] Timeline chart render fallback:', chartErr);
  }

  startVictoryCelebration(winnerObj);

  // Theatre.js cinematic 360-degree victory orbit & character portrait emotional reactions
  playVictoryCinematicOrbit(14000);
  const winnerIdx = winnerObj.id !== undefined ? winnerObj.id : (gameState.players ? gameState.players.indexOf(winnerObj) : 0);
  setPlayerPortraitMood(winnerIdx, 'cheering', 15000);
  (gameState.players || []).forEach((p, idx) => {
    if (idx !== winnerIdx) {
      setPlayerPortraitMood(idx, p.bankrupt ? 'bankrupt' : 'crying', 15000);
    }
  });
}

export function handlePlayAgainAction() {
  if (networkState.isMultiplayer && !networkState.isHost) {
    const myName = (matchSettings.customPlayers[networkState.localPlayerIdx] || {}).name || 'Tycoon Friend';
    broadcastAction('ACTION_REQUEST_PLAY_AGAIN', {
      playerName: myName
    });
    updateModalSlice('victory', {
      playAgainText: 'WAITING FOR HOST...',
      playAgainDisabled: true,
      multiplayerStatus: 'Rematch requested! Waiting for Room Host to start...'
    });
    playSFX('hop');
    logEvent('⏳ Rematch requested from Room Host.');
    return;
  }

  stopVictoryCelebration();
  updateModalSlice('victory', { visible: false });
  closeAllGameModals();

  if (networkState.isMultiplayer && networkState.isHost) {
    broadcastStartOnlineMatch();
  }

  playIntroCinematicFlyIn();
  if (engineCallbacks.startNewMatch) {
    engineCallbacks.startNewMatch();
  } else if (window.startNewMatch) {
    window.startNewMatch();
  }
}

export function handleReturnToLobbyFromVictory() {
  stopVictoryCelebration();
  updateModalSlice('victory', { visible: false });
  closeAllGameModals();

  if (engineCallbacks.terminateMatchAndReturnToLobby) {
    engineCallbacks.terminateMatchAndReturnToLobby();
  } else if (typeof window.terminateMatchAndReturnToLobby === 'function') {
    window.terminateMatchAndReturnToLobby();
  } else {
    gameState.gameStarted = false;
    gameState.phase = 'SETUP';

    if (networkState.isMultiplayer) {
      if (networkState.isHost) {
        broadcastReturnToLobby();
        logEvent('👑 Table Host brought all room players back to the lobby.');
      } else {
        broadcastAction('ACTION_GUEST_LOBBY', {
          senderIdx: networkState.localPlayerIdx
        });
        logEvent('🚪 Returned to room lobby.');
      }
    }

    if (window.openLandingSetupScreen) {
      window.openLandingSetupScreen();
    } else if (window.openSetupModal) {
      window.openSetupModal();
    }
  }
}

export function closeVictoryAndPlayAgain() {
  handlePlayAgainAction();
}

/* ─────────────────────────────────────────────────────────────────────────────
   MONOPOLY CELEBRATION MODAL (better-ui)
───────────────────────────────────────────────────────────────────────────── */
export function openMonopolyCelebrationModal(playerIdx, groupKey) {
  if (isLobbyScreenActive()) return;
  const p = (gameState.players && gameState.players[playerIdx]) || { name: 'Player 1', colorHex: '#ef4444' };
  const group = GROUP_META[groupKey];
  if (!group) return;
  const arch = ARCHETYPES ? ARCHETYPES[p.hatStyle || 0] : null;
  const avatarIcon = arch?.icon || '🎩';
  const avatarInitial = p.name || 'YOU';

  // 2. Deed Cards Data for Svelte 5 MonopolyCelebrationModal
  const groupTiles = BOARD_TILES.filter(t => t.type === 'city' && t.group === groupKey);
  const deedCards = groupTiles.map(t => {
    const baseRent = t.rent ? (Array.isArray(t.rent) ? t.rent[0] : t.rent) : (t.price ? Math.round(t.price * 0.1) : 50000);
    const boostedRent = (baseRent || 50000) * 2;
    return {
      name: t.name,
      rentFormatted: `${fmtMoney(boostedRent)} / visit`,
      colorHex: group.hex
    };
  });

  updateModalSlice('monopolyCelebration', {
    visible: true,
    winnerName: p.name,
    groupName: group.name,
    groupColor: group.hex,
    playerColor: p.colorHex || '#ef4444',
    avatarInitial,
    avatarIcon,
    deedCards
  });

  playSFX('win');
  fireConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.45, 120);
  spawnAnimatedReaction('money');
  setMonopolyTileHighlights(groupTiles.map(t => t.id), group.hex);
  animateMonopolyRibbonUnfurl(group.name, group.hex);

  clearTimeout(monopolyCloseTimer);
  monopolyCloseTimer = setTimeout(closeMonopolyModal, 4800);

  logEvent(`👑 <strong>${p.name}</strong> completed the <strong>${group.name}</strong> Monopoly! All cities collect <strong>2× Rent</strong>!`);
}

export function closeMonopolyModal() {
  clearTimeout(monopolyCloseTimer);
  monopolyCloseTimer = null;
  updateModalSlice('monopolyCelebration', { visible: false });
}

export function checkAndTriggerMonopoly(playerIdx, groupKey) {
  if (!groupKey) return;
  if (!gameState.achievedMonopolies) gameState.achievedMonopolies = {};

  const key = `${playerIdx}_${groupKey}`;
  if (gameState.achievedMonopolies[key]) return;

  if (ownsFullColorGroup(playerIdx, groupKey)) {
    gameState.achievedMonopolies[key] = true;
    openMonopolyCelebrationModal(playerIdx, groupKey);
    if (networkState.isMultiplayer) {
      broadcastAction('ACTION_MONOPOLY', { playerIdx, groupKey });
    }
  }
}

if (typeof window !== 'undefined') {
  window.openMonopolyCelebrationModal = openMonopolyCelebrationModal;
  window.closeMonopolyModal = closeMonopolyModal;
  window.triggerMonopolyCelebration = (group = 'brown', pIdx = 0) => openMonopolyCelebrationModal(pIdx, group);
}
