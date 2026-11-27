<script>
  /**
   * svelte/lobby/MatchSettingsPanel.svelte
   * Declarative match settings panel (Starting Cash, Turn Timer, Duration, Atmosphere, Board Style, Edition).
   */
  import { lobbyStore } from '../stores/lobbyStore.js';
  import LobbyNetworkStatus from './LobbyNetworkStatus.svelte';

  let state = $state({});
  lobbyStore.subscribe(val => { state = val; });

  const isGuest = $derived(state.isMultiplayer && !state.isHost);
  const isCyber = $derived(state.boardStyle === 'cyberpunk');

  function setCash(amt) {
    window.setStartingCash?.(amt);
  }

  function stepDecision(delta) {
    window.stepDecisionTime?.(delta);
  }

  function stepDuration(delta) {
    window.stepMatchDuration?.(delta);
  }

  function setEdition(ed) {
    window.setBoardEdition?.(ed);
  }

  function setStyle(st) {
    window.setBoardStyle?.(st);
  }

  function stepAtmo(delta) {
    window.stepAtmosphere?.(delta);
  }

  function getAtmoLabel(theme) {
    if (theme === 'night') return 'Night';
    if (theme === 'sunset') return 'Sunset';
    return 'Morning';
  }
</script>

<div id="lobby-settings-column" class="w-full h-auto max-h-full min-h-0 lg:overflow-y-auto game-panel-card p-3 sm:p-4 flex flex-col shadow-xl space-y-2.5">
  <div class="space-y-2.5 sm:space-y-3">
    <!-- Header -->
    <div class="flex items-center justify-between border-b-2 border-sky-100 pb-2.5">
      <div class="flex items-center gap-2.5 font-black text-sm sm:text-base text-[#0284c7] uppercase tracking-wide">
        <i class="fa-solid fa-sliders text-sky-500 text-lg"></i> MATCH SETTINGS
      </div>
      <LobbyNetworkStatus variant="badge" />
    </div>

    <!-- Guest Locked Banner -->
    {#if isGuest}
      <div id="lobby-guest-locked-banner" class="bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-2xl p-3 text-xs font-black flex items-center gap-2.5 shadow-xs mb-1">
        <i class="fa-solid fa-lock text-amber-600 text-base"></i>
        <div>
          <div class="text-[11px] font-black tracking-wider uppercase text-amber-700">Client Mode</div>
          <div>Room settings controlled by Table Host</div>
        </div>
      </div>
    {/if}

    <!-- 1. Dedicated Local Play Arcade Header -->
    {#if !state.isMultiplayer}
      <div id="lobby-local-mode-header" class="p-3 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border-2 border-sky-200/80 shadow-2xs flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center text-base shadow-sm">
            <i class="fa-solid fa-gamepad"></i>
          </div>
          <div>
            <div class="text-xs font-black uppercase text-slate-800 tracking-wide flex items-center gap-1.5">
              <span>LOCAL PASS &amp; PLAY</span>
            </div>
            <div class="text-[10px] font-semibold text-slate-500">Play together on this device</div>
          </div>
        </div>
        <span class="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-white text-sky-700 border border-sky-200 shadow-2xs">OFFLINE</span>
      </div>
    {:else}
      <!-- WebRTC P2P Room Panel (Expands when Multiplayer is active) -->
      <div id="setup-p2p-panel" class="p-3.5 rounded-2xl bg-sky-50 border-2 border-sky-200 space-y-2.5">
        <div class="text-xs font-black text-sky-900 flex items-center justify-between">
          <span class="flex items-center gap-1.5">
            <i class="fa-solid fa-globe text-sky-500"></i>
            <span>ONLINE ROOM</span>
          </span>
          <LobbyNetworkStatus variant="status" />
        </div>

        {#if !state.isRoomActive}
          <!-- Unconnected Controls -->
          <div id="p2p-unconnected-controls" class="space-y-2">
            <button id="btn-p2p-create-room" onclick={() => window.hostP2PRoom?.()} class="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-black text-xs shadow-sm cursor-pointer transition">
              <i class="fa-solid fa-crown text-amber-300 mr-1.5"></i> Host Room
            </button>
            <div class="flex gap-2">
              <input id="input-p2p-room-code" type="text" maxlength="6" aria-label="Room Code" autocomplete="off" autocapitalize="characters" placeholder="ENTER ROOM CODE" onkeydown={(e) => e.key === 'Enter' && window.joinP2PRoom?.()} class="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-black uppercase bg-white tracking-wider focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
              <button id="btn-p2p-join-room" onclick={() => window.joinP2PRoom?.()} class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs shadow-sm cursor-pointer transition-[transform,background-color] duration-150">
                Join
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- 1. Section Card: Rules & Pace -->
    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-3.5 space-y-3 shadow-2xs">
      <div class="flex items-center justify-between pb-0.5">
        <span class="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <i class="fa-solid fa-scale-balanced text-sky-600"></i>
          <span>Rules &amp; Pace</span>
        </span>
        <span class="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
          {state.isTeamMode ? '4-Group Target' : '3-Group Target'}
        </span>
      </div>

      <!-- Game Mode (Solo FFA vs Team Mode) -->
      <div class="grid grid-cols-2 gap-1.5 bg-slate-200/80 p-1 rounded-xl">
        <button
          id="setup-mode-ffa"
          type="button"
          aria-pressed={!state.isTeamMode}
          onclick={() => window.setTeamMode?.(false)}
          disabled={isGuest}
          class="py-2 px-2.5 rounded-lg text-xs font-black transition-[transform,background-color,color] duration-150 enabled:active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5 {!state.isTeamMode ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'} {isGuest ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}"
        >
          <i class="fa-solid fa-crown text-[11px] {!state.isTeamMode ? 'text-amber-200' : 'text-amber-500'}" aria-hidden="true"></i>
          <span>Solo FFA</span>
        </button>
        <button
          id="setup-mode-team"
          type="button"
          aria-pressed={Boolean(state.isTeamMode)}
          onclick={() => window.setTeamMode?.(true)}
          disabled={isGuest}
          class="py-2 px-2.5 rounded-lg text-xs font-black transition-[transform,background-color,color] duration-150 enabled:active:scale-[0.96] cursor-pointer flex items-center justify-center gap-1.5 {state.isTeamMode ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400' : 'text-slate-700 hover:text-slate-900'} {isGuest ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}"
        >
          <i class="fa-solid fa-handshake text-[11px] {state.isTeamMode ? 'text-indigo-200' : 'text-indigo-600'}" aria-hidden="true"></i>
          <span>Team Mode</span>
        </button>
      </div>

      <!-- Starting Capital Segmented Bar -->
      <div class="space-y-1">
        <div class="text-[11px] font-black uppercase text-slate-700 tracking-wider">Starting Capital</div>
        <div class="grid grid-cols-4 gap-1.5 bg-slate-200/80 p-1 rounded-xl">
          {#each [1500000, 2000000, 3000000, 5000000] as cashOpt}
            <button
              id="setup-cash-{cashOpt}"
              type="button"
              aria-pressed={state.startingCash === cashOpt}
              onclick={() => setCash(cashOpt)}
              disabled={isGuest}
              class="py-1.5 rounded-lg text-xs font-black tabular-nums transition-[background-color,color] duration-150 cursor-pointer text-center {state.startingCash === cashOpt ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'} {isGuest ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}"
            >
              ${cashOpt / 1000000}M
            </button>
          {/each}
        </div>
      </div>

      <!-- Twin Pace Steppers (Turn Timer & Match Limit) -->
      <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
        <!-- Turn Timer Stepper Capsule -->
        <div class="flex items-center justify-between bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
          <span class="text-[11px] font-black uppercase text-slate-700 tracking-wider">Timer</span>
          <div class="flex items-center gap-1.5">
            <button type="button" onclick={() => stepDecision(-1)} disabled={isGuest} aria-label="Decrease turn timer" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-xs flex items-center justify-center cursor-pointer active:scale-90 transition-[transform,background-color] duration-150 {isGuest ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">-</button>
            <span id="setup-decision-time-text" class="text-xs font-black text-slate-900 font-mono tabular-nums min-w-[28px] text-center">{state.decisionTime || 20}s</span>
            <button type="button" onclick={() => stepDecision(1)} disabled={isGuest} aria-label="Increase turn timer" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-xs flex items-center justify-center cursor-pointer active:scale-90 transition-[transform,background-color] duration-150 {isGuest ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">+</button>
          </div>
        </div>

        <!-- Match Limit Stepper Capsule -->
        <div class="flex items-center justify-between bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
          <span class="text-[11px] font-black uppercase text-slate-700 tracking-wider">Limit</span>
          <div class="flex items-center gap-1.5">
            <button type="button" onclick={() => stepDuration(-1)} disabled={isGuest} aria-label="Decrease match duration" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-xs flex items-center justify-center cursor-pointer active:scale-90 transition-[transform,background-color] duration-150 {isGuest ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">-</button>
            <span id="setup-match-duration-text" class="text-xs font-black text-slate-900 font-mono tabular-nums min-w-[34px] text-center">{state.matchDuration || 15}m</span>
            <button type="button" onclick={() => stepDuration(1)} disabled={isGuest} aria-label="Increase match duration" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-xs flex items-center justify-center cursor-pointer active:scale-90 transition-[transform,background-color] duration-150 {isGuest ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">+</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Section Card: Board & Atmosphere -->
    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-3.5 space-y-3 shadow-2xs">
      <div class="flex items-center justify-between pb-0.5">
        <span class="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <i class="fa-solid fa-earth-americas text-sky-600"></i>
          <span>Board &amp; Atmosphere</span>
        </span>
        <span id="lobby-edition-tiles-text" class="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
          {state.boardEdition === 'rajasthan' ? '32 Royal Cities' : '32 World Cities'}
        </span>
      </div>

      <!-- Map Edition Segmented Switcher -->
      <div class="grid grid-cols-2 gap-1.5 bg-slate-200/80 p-1 rounded-xl">
        <button
          id="setup-edition-world"
          type="button"
          aria-pressed={state.boardEdition !== 'rajasthan'}
          onclick={() => setEdition('world')}
          disabled={isGuest}
          class="py-2 px-2.5 rounded-lg text-xs font-black transition-[background-color,color] duration-150 cursor-pointer flex items-center justify-center gap-1.5 {state.boardEdition !== 'rajasthan' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'} {isGuest ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}"
        >
          <i class="fa-solid fa-earth-americas text-[11px]" aria-hidden="true"></i>
          <span>World Tour</span>
        </button>
        <button
          id="setup-edition-rajasthan"
          type="button"
          aria-pressed={state.boardEdition === 'rajasthan'}
          onclick={() => setEdition('rajasthan')}
          disabled={isGuest}
          class="py-2 px-2.5 rounded-lg text-xs font-black transition-[background-color,color] duration-150 cursor-pointer flex items-center justify-center gap-1.5 {state.boardEdition === 'rajasthan' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'} {isGuest ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}"
        >
          <i class="fa-solid fa-chess-rook text-[11px]" aria-hidden="true"></i>
          <span>Rajasthan</span>
        </button>
      </div>

      <!-- Board Style & Lighting Twin Stepper Row -->
      <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
        <!-- Style Segmented Switcher -->
        <div class="flex items-center justify-between bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
          <span class="text-[11px] font-black uppercase text-slate-700 tracking-wider">Style</span>
          <div class="flex items-center gap-1">
            {#each [{ id: 'wood', icon: 'fa-tree', label: 'Wood' }, { id: 'cyberpunk', icon: 'fa-bolt', label: 'Cyber' }, { id: 'elegant', icon: 'fa-gem', label: 'Elegant' }] as styleOpt}
              <button
                id="setup-board-{styleOpt.id}"
                type="button"
                aria-pressed={state.boardStyle === styleOpt.id}
                onclick={() => setStyle(styleOpt.id)}
                disabled={isGuest}
                aria-label="Board style: {styleOpt.label}"
                class="w-7 h-7 rounded-lg text-xs transition-[transform,background-color,color] duration-150 cursor-pointer flex items-center justify-center {state.boardStyle === styleOpt.id ? 'bg-sky-500 text-white shadow-2xs scale-105' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'} {isGuest ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}"
                title={styleOpt.label}
              >
                <i class="fa-solid {styleOpt.icon} text-[11px]" aria-hidden="true"></i>
              </button>
            {/each}
          </div>
        </div>

        <!-- Atmosphere Stepper Capsule -->
        <div class="flex items-center justify-between bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
          <span class="text-[11px] font-black uppercase text-slate-700 tracking-wider">Light</span>
          <div class="flex items-center gap-1">
            <button type="button" onclick={() => stepAtmo(-1)} disabled={isGuest || isCyber} aria-label="Previous lighting theme" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-xs flex items-center justify-center cursor-pointer active:scale-90 transition-[transform,background-color] duration-150 {(isGuest || isCyber) ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">-</button>
            <span id="setup-atmosphere-text" class="text-xs font-black text-slate-900 font-mono truncate min-w-[46px] text-center">
              {getAtmoLabel(state.lightingTheme)}
            </span>
            <button type="button" onclick={() => stepAtmo(1)} disabled={isGuest || isCyber} aria-label="Next lighting theme" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-xs flex items-center justify-center cursor-pointer active:scale-90 transition-[transform,background-color] duration-150 {(isGuest || isCyber) ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">+</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
