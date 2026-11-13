<script>
  /**
   * svelte/lobby/LobbyHeader.svelte
   * Declarative lobby top bar: navigation, player profile capsule, logo, version pill, rules, and sound controls.
   */
  import { lobbyStore } from '../stores/lobbyStore.js';

  let state = $state({});
  lobbyStore.subscribe(val => { state = val; });

  const isTitle = $derived(state.currentView === 'title');

  function backToTitle() {
    window.showTitleScreen?.();
  }

  function editName() {
    if (isTitle) {
      window.promptEditPlayerName?.();
    }
  }

  function checkUpdate() {
    window.checkGameUpdateManually?.();
  }

  function toggleDebug() {
    window.toggleDebugPanel?.();
  }

  function openRules() {
    window.openRulesModal?.();
  }

  function toggleSound() {
    window.toggleSound?.();
  }

  function onVolumeInput(e) {
    window.setGameVolume?.(e.target.value / 100);
  }

  function resetLobby() {
    if (confirm('Reset match settings to defaults?')) {
      window.location.reload();
    }
  }
</script>

<div class="relative z-20 max-w-7xl 2xl:max-w-[1540px] w-full mx-auto flex items-center justify-between gap-1.5 sm:gap-3 flex-shrink-0 pt-0.5 pb-1.5 sm:pb-2 mb-1">
  <!-- Left: Navigation & Player Profile Capsule (Unified 38px Height) -->
  <div class="flex items-center gap-1.5 sm:gap-2">
    {#if !isTitle}
      <button id="btn-lobby-back-to-title" onclick={backToTitle} class="h-[38px] px-2.5 sm:px-3 rounded-full bg-white hover:bg-slate-50 text-slate-800 font-black text-xs shadow-md border-2 border-slate-200 cursor-pointer inline-flex items-center justify-center gap-1.5 flex-shrink-0 whitespace-nowrap transition-transform hover:scale-[1.02] active:scale-[0.98]" title="Return to Title Menu" aria-label="Return to Title Menu">
        <i class="fa-solid fa-arrow-left text-sky-600 text-xs"></i>
        <span class="hidden sm:inline font-black text-xs uppercase tracking-wider">Back</span>
      </button>
    {/if}

    <div class="h-[38px] flex items-center gap-1.5 sm:gap-2 bg-white/95 rounded-full px-1.5 py-0.5 pr-2.5 sm:pr-3 shadow-md border-2 border-white backdrop-blur-sm flex-shrink-0">
      <div id="setup-profile-avatar" class="w-7 h-7 rounded-full border-2 border-emerald-400 overflow-hidden flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-200 font-black text-emerald-800 text-xs shadow-inner flex-shrink-0">
        {(state.activeDisplayName || 'T')[0]?.toUpperCase() || 'T'}
      </div>
      <div class="flex items-center gap-1.5 sm:gap-2">
        <div id="setup-profile-name-btn" class="flex items-center gap-1 sm:gap-1.5 {isTitle ? 'cursor-pointer hover:opacity-80' : ''} transition max-w-[70px] sm:max-w-[120px] md:max-w-none" onclick={editName} title={isTitle ? 'Click to edit your tycoon name' : 'Names are locked in lobby - return to Home Screen to change'}>
          <span id="setup-profile-name" class="text-xs sm:text-sm font-black uppercase text-slate-800 tracking-wider truncate">
            {state.activeDisplayName || 'TYCOON'}
          </span>
          <svg class="ui-icon w-3 h-3 text-amber-500 flex-shrink-0" aria-hidden="true"><use href="#icon-crown"></use></svg>
          <i id="setup-profile-edit-icon" class="fa-solid {isTitle ? 'fa-pen text-amber-500' : 'fa-lock text-slate-400'} text-[8px] ml-0.5 flex-shrink-0"></i>
        </div>
        <span class="w-px h-3.5 bg-slate-200"></span>
        <div class="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[11px] shadow-xs border border-amber-300" title="Your Tycoon Stars">
          <svg class="ui-icon w-3 h-3 text-slate-950 flex-shrink-0" aria-hidden="true"><use href="#icon-star"></use></svg>
          <span id="setup-profile-stars" class="font-mono tabular-nums text-[11px] font-black">{state.profileStars ?? 500}</span>
          <span class="hidden sm:inline text-[9px] uppercase tracking-wider font-extrabold text-amber-950">STARS</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Center: Original World Tycoon 3D Game Logo -->
  <div class="flex flex-col items-center flex-shrink-0">
    <div class="game-logo-3d cursor-default flex items-center gap-1.5 sm:gap-2">
      <svg class="ui-icon w-5 h-5 sm:w-7 sm:h-7 text-sky-400 logo-globe-icon drop-shadow" aria-hidden="true"><use href="#icon-globe"></use></svg>
      <span class="logo-brand-world text-sm sm:text-xl lg:text-2xl font-black">WORLD</span>
      <span class="logo-brand-tycoon text-sm sm:text-xl lg:text-2xl font-black">TYCOON</span>
    </div>
    <div class="flex items-center gap-1 sm:gap-1.5 mt-0.5">
      <div class="logo-edition-pill text-[9px] sm:text-[10px]">
        GLOBAL EDITION
      </div>
      <button id="btn-version-pill" onclick={checkUpdate} class="logo-edition-pill !bg-slate-800/80 hover:!bg-slate-700/90 text-sky-300 border border-sky-400/30 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-mono cursor-pointer transition-all flex items-center gap-1 active:scale-95" title="Game Version — Click to check for updates" aria-label="Game Version and Update Status">
        <span id="version-pill-dot" class="w-1.5 h-1.5 rounded-full {state.hasUpdate ? 'bg-amber-400 animate-ping' : 'bg-slate-400'}"></span>
        <span id="version-pill-text">{state.gameVersion || 'v1.0.8'}</span>
      </button>
    </div>
  </div>

  <!-- Right: Rules, Audio & Quick Action Buttons (Unified 38px Height) -->
  <div class="flex items-center gap-1 sm:gap-2">
    <button data-debug-ui="true" onclick={toggleDebug} class="h-[38px] top-pill px-2.5 sm:px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md border-2 border-white cursor-pointer flex items-center gap-1 flex-shrink-0 transition-transform hover:scale-105 active:scale-95" title="Open Debug & QA Suite [Key: ~ or F2]" aria-label="Open Debug & QA Suite">
      <i class="fa-solid fa-bug text-slate-900 text-xs"></i>
      <span class="hidden sm:inline">DEBUG</span>
    </button>
    <button onclick={openRules} class="h-[38px] top-pill px-2.5 sm:px-3.5 bg-white hover:bg-slate-50 text-slate-800 font-extrabold text-xs shadow-md border-2 border-white cursor-pointer flex items-center gap-1.5 flex-shrink-0 transition-transform hover:scale-105 active:scale-95" title="How to Play & Rules" aria-label="How to Play & Rules">
      <i class="fa-solid fa-book-open text-sky-600 text-xs"></i>
      <span class="hidden sm:inline">RULES</span>
    </button>
    <div class="h-[38px] flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 rounded-full shadow-md border-2 border-white flex-shrink-0" title="Adjust Sound Volume">
      <button onclick={toggleSound} id="setup-btn-sound" class="text-slate-700 hover:text-slate-900 cursor-pointer flex items-center justify-center p-1 rounded-full hover:bg-slate-100/80 active:scale-95 flex-shrink-0" title="Mute / Unmute Sound" aria-label="Mute or Unmute Sound">
        <i id="setup-btn-sound-icon" class="fa-solid {state.soundEnabled && state.soundVolume > 0 ? (state.soundVolume >= 50 ? 'fa-volume-high' : 'fa-volume-low') : 'fa-volume-xmark'} text-xs text-sky-600"></i>
      </button>
      <input type="range" id="setup-sound-slider" min="0" max="100" value={state.soundVolume ?? 75} oninput={onVolumeInput} class="sound-slider hidden sm:inline-block w-14 sm:w-18 flex-shrink-0" title="Slide to adjust volume" aria-label="Volume Slider" />
      <span id="setup-sound-volume-val" class="hidden sm:inline-block text-[11px] font-black tabular-nums text-slate-700 w-7 text-right flex-shrink-0">{state.soundVolume ?? 75}%</span>
    </div>
    <button onclick={resetLobby} class="w-[38px] h-[38px] rounded-full border-2 border-white bg-rose-500 hover:bg-rose-600 text-white shadow-md flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105 active:scale-95 cursor-pointer" title="Reset Lobby" aria-label="Reset Match Settings to Defaults">
      <i class="fa-solid fa-rotate-left text-xs font-black"></i>
    </button>
  </div>
</div>
