<script>
  import { hudStore } from '../stores/hudStore.js';

  let state = $state({});
  hudStore.subscribe(val => { state = val; });

  function onLobby() { window.handleLobbyButtonClick?.(); }
  function onCities() { window.openPortfolioModal?.(); }
  function onTrade() { window.openTradeModal?.(); }
  function onSpeed() { window.cycleGameSpeed?.(); }
  function onLeaderboard() { window.toggleLeaderboardModal?.(); }
  function onCopyRoom() { window.copyRoomInviteLink?.(); }
  function onLight() { window.cycleLightingMode?.(); }
  function onToggleSound() { window.toggleSound?.(); }
  function onVolumeInput(e) { window.setGameVolume?.(e.target.value / 100); }
  function onRotateLeft() { window.rotateBoardLeft?.(); }
  function onResetCam() { window.resetCameraView?.(); }
  function onRotateRight() { window.rotateBoardRight?.(); }
  function onRules() { window.openRulesModal?.(); }
  function onEventLog() { window.toggleEventLogDrawer?.(); }
  function onDebug() { window.toggleDebugPanel?.(); }
</script>

<header id="main-game-hud-bar" class="fixed top-2.5 sm:top-3 inset-x-3 sm:inset-x-5 z-[1300] flex items-center justify-between pointer-events-none select-none gap-2 flex-nowrap">
  <!-- Left Pod: Navigation & Primary Actions -->
  <div class="flex items-center gap-1.5 sm:gap-2 pointer-events-auto flex-shrink-0">
    <button id="btn-top-lobby" onclick={onLobby} class="hud-pill text-indigo-950 font-bold cursor-pointer transition-transform hover:scale-105 active:scale-95" title="Return to Lobby" aria-label="Return to Lobby">
      <i class="fa-solid fa-house text-indigo-600"></i>
      <span class="hidden sm:inline">Lobby</span>
    </button>

    <div class="h-5 w-px bg-slate-300/60 hidden sm:block"></div>

    <button id="btn-manage-cities" onclick={onCities} class="hud-pill text-indigo-950" title="Manage Cities" aria-label="Manage Cities Portfolio">
      <i class="fa-solid fa-city text-indigo-600"></i>
      <span class="hidden md:inline">Manage Cities</span>
      <span class="hidden sm:inline md:hidden">Cities</span>
    </button>
    <button id="btn-trade" onclick={onTrade} class="hud-pill text-emerald-950" title="Trade Properties with Opponents" aria-label="Trade Properties">
      <i class="fa-solid fa-handshake text-emerald-600"></i>
      <span class="hidden sm:inline">Trade</span>
    </button>
  </div>

  <!-- Center Pod: Match Status Capsule -->
  <div id="hud-match-status-capsule" class="hud-glass-capsule pointer-events-auto md:flex items-center gap-2.5 px-3.5 shadow-sm flex-shrink-0">
    <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700" title="Elapsed Match Time">
      <i class="fa-regular fa-clock text-slate-500"></i>
      <span id="hud-game-clock" class="tabular-nums font-black text-slate-800">{state.clock || '00:00'}</span>
    </div>

    <span class="hud-capsule-divider"></span>

    <button id="btn-game-speed" onclick={onSpeed} class="hud-capsule-btn px-2 py-0.5 rounded-full text-slate-700 hover:text-sky-600 hover:bg-slate-100 text-xs font-black cursor-pointer transition" title="Game Speed (1x, 2x, 4x Turbo)" aria-label="Cycle Game Speed">
      <span id="game-speed-label">{state.gameSpeed === 4 ? '🚀 4× Turbo' : state.gameSpeed === 2 ? '⚡ 2× Fast' : '⚡ 1×'}</span>
    </button>

    <span class="hud-capsule-divider"></span>

    <div class="flex items-center gap-1.5 text-xs font-bold text-amber-900" title="Completed Sets / 3 for Instant Win">
      <i class="fa-solid fa-crown text-amber-500"></i>
      <span id="hud-bonus-counter" class="tabular-nums font-black">{state.monopolySets || '0/3 Sets'}</span>
    </div>

    <span class="hud-capsule-divider"></span>

    <button onclick={onLeaderboard} class="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-amber-600 transition cursor-pointer" title="View Tycoon Leaderboard" aria-label="View Net Worth Leaderboard">
      <i class="fa-solid fa-trophy text-amber-500"></i>
      <span class="tabular-nums font-black text-slate-800">{state.playerCount || '2/2'}</span>
    </button>
  </div>

  <!-- Right Pod: Settings, Atmosphere & Tools -->
  <div class="flex items-center gap-1.5 sm:gap-2 pointer-events-auto flex-shrink-0">
    {#if state.isMultiplayer && state.roomCode}
      <button onclick={onCopyRoom} class="hud-pill !bg-indigo-50 border-indigo-200 text-indigo-900 cursor-pointer" title="Click to copy room invite link" aria-label="Copy Room Invite Link">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="font-extrabold text-xs">Room: {state.roomCode}</span>
        <i class="fa-regular fa-copy text-xs text-indigo-500"></i>
      </button>
    {/if}

    <button onclick={onLight} class="hud-pill text-slate-700" title="Toggle Lighting Theme" aria-label="Toggle Lighting Atmosphere">
      <i class="fa-solid fa-sun text-amber-500"></i>
      <span class="hidden xl:inline text-xs">{state.lightingMode || 'Day'}</span>
    </button>

    <!-- Sound Control Pill -->
    <div id="hud-sound-container" class="hud-pill hud-pill-sound flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1" title="Adjust Sound Volume">
      <button id="btn-sound" onclick={onToggleSound} class="text-slate-700 hover:text-slate-950 transition cursor-pointer flex items-center justify-center p-1 rounded-full hover:bg-slate-100/80 active:scale-95 flex-shrink-0" title="Mute / Unmute Sound" aria-label="Mute or Unmute Sound">
        <i id="btn-sound-icon" class="fa-solid {state.soundEnabled && state.soundVolume > 0 ? (state.soundVolume >= 50 ? 'fa-volume-high' : 'fa-volume-low') : 'fa-volume-xmark'} text-xs text-sky-600"></i>
      </button>
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <input id="sound-volume-slider" type="range" min="0" max="100" value={state.soundVolume} oninput={onVolumeInput} class="sound-slider min-w-[64px] w-16 sm:w-20 flex-shrink-0" title="Slide to adjust volume" aria-label="Sound volume slider">
        <span id="sound-volume-val" class="text-[11px] font-black tabular-nums text-slate-700 w-7 text-right flex-shrink-0">{state.soundVolume}%</span>
      </div>
    </div>

    <!-- Camera Controls -->
    <div class="hud-pill !px-1.5 !gap-0.5 hidden lg:flex items-center" title="Camera Rotation Controls">
      <button id="btn-hud-camera-rotate-left" onclick={onRotateLeft} class="p-1 px-1.5 text-slate-600 hover:text-indigo-600 rounded-full hover:bg-slate-100 transition" title="Rotate Board 45° Left" aria-label="Rotate Board Left">
        <i class="fa-solid fa-rotate-left text-xs"></i>
      </button>
      <button id="btn-hud-camera-reset" onclick={onResetCam} class="p-1 px-1.5 text-slate-600 hover:text-indigo-600 rounded-full hover:bg-slate-100 transition" title="Reset Isometric Camera" aria-label="Reset Camera View">
        <i class="fa-solid fa-compress text-xs"></i>
      </button>
      <button id="btn-hud-camera-rotate-right" onclick={onRotateRight} class="p-1 px-1.5 text-slate-600 hover:text-indigo-600 rounded-full hover:bg-slate-100 transition" title="Rotate Board 45° Right" aria-label="Rotate Board Right">
        <i class="fa-solid fa-rotate-right text-xs"></i>
      </button>
    </div>

    <!-- Quick Utilities -->
    <button id="btn-hud-rules" onclick={onRules} class="hud-circle-icon-btn" title="How to Play & Game Rules" aria-label="How to Play and Rules">
      <i class="fa-regular fa-circle-question text-slate-700 text-sm"></i>
    </button>

    <button id="btn-hud-event-log" onclick={onEventLog} class="hud-circle-icon-btn" title="Open Activity Event Log" aria-label="Open Activity Event Log">
      <i class="fa-regular fa-file-lines text-slate-700 text-xs"></i>
    </button>

    <!-- Debug Trigger -->
    <button id="btn-hud-debug" data-debug-ui="true" onclick={onDebug} class="hud-pill !bg-amber-400 hover:!bg-amber-300 text-slate-950 font-black border border-amber-300 !px-2.5 !py-1 text-xs flex items-center gap-1 cursor-pointer" title="Open Debug & QA Suite [Key: ~ or F2]" aria-label="Open Debug Panel">
      <i class="fa-solid fa-bug text-xs"></i>
      <span class="hidden 2xl:inline text-[11px]">DEBUG</span>
    </button>
  </div>
</header>
