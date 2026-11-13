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

<div id="lobby-settings-column" class="col-span-12 lg:col-span-4 game-panel-card p-3.5 sm:p-5 flex flex-col justify-between shadow-xl min-h-[460px] lg:min-h-[500px] space-y-3">
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between border-b-2 border-sky-100 pb-3">
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
              <input id="input-p2p-room-code" type="text" maxlength="6" placeholder="ENTER ROOM CODE" onkeydown={(e) => e.key === 'Enter' && window.joinP2PRoom?.()} class="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-black uppercase bg-white tracking-wider focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200" />
              <button id="btn-p2p-join-room" onclick={() => window.joinP2PRoom?.()} class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs shadow-sm cursor-pointer transition">
                Join
              </button>
            </div>
          </div>
        {:else}
          <!-- Connected Room Controls -->
          <div id="p2p-connected-controls" class="grid grid-cols-3 gap-2">
            <button id="btn-p2p-copy-link" onclick={() => window.copyRoomInviteLink?.()} class="py-2 px-2 rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 font-black text-xs cursor-pointer shadow-2xs transition flex items-center justify-center gap-1.5" title="Copy Invite Link">
              <i class="fa-solid fa-link text-xs"></i> <span>Link</span>
            </button>
            <button id="btn-p2p-copy-code" onclick={() => window.copyRoomCodeOnly?.()} class="py-2 px-2 rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 font-black text-xs cursor-pointer shadow-2xs transition flex items-center justify-center gap-1.5" title="Copy Room Code Only">
              <i class="fa-solid fa-copy text-xs"></i> <span>Code</span>
            </button>
            <button id="btn-p2p-leave" onclick={() => window.leaveP2PRoom?.()} class="py-2 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-300 font-black text-xs cursor-pointer shadow-2xs transition flex items-center justify-center gap-1.5" title="Leave Room">
              <i class="fa-solid fa-arrow-right-from-bracket text-xs"></i> <span>Leave</span>
            </button>
          </div>
        {/if}
      </div>
    {/if}

    <!-- 1. Section Card: Rules & Pace -->
    <div class="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 space-y-3 shadow-2xs">
      <div class="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        <i class="fa-solid fa-scale-balanced text-sky-500"></i> Rules &amp; Pace
      </div>

      <!-- Starting Capital -->
      <div>
        <div class="text-xs font-black text-slate-700 mb-1.5">Starting Capital</div>
        <div class="grid grid-cols-4 gap-1.5 bg-slate-200/60 p-1 rounded-xl">
          {#each [1500000, 2000000, 3000000, 5000000] as cashOpt}
            <button
              id="setup-cash-{cashOpt}"
              onclick={() => setCash(cashOpt)}
              disabled={isGuest}
              class="py-1.5 rounded-lg text-xs font-black transition cursor-pointer text-center {state.startingCash === cashOpt ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'} {isGuest ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}"
            >
              ${cashOpt / 1000000}M
            </button>
          {/each}
        </div>
      </div>

      <!-- Twin Pace Controls: Turn Timer & Match Limit -->
      <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/70">
        <!-- Turn Timer Stepper -->
        <div class="bg-white rounded-xl p-2 border border-slate-200 flex flex-col justify-between">
          <span class="text-[11px] font-black uppercase text-slate-600 tracking-tight">Turn Timer</span>
          <div class="flex items-center justify-between mt-1">
            <button onclick={() => stepDecision(-1)} disabled={isGuest} class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 transition {isGuest ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">-</button>
            <span id="setup-decision-time-text" class="text-xs font-black text-slate-900 font-mono">{state.decisionTime || 20} s</span>
            <button onclick={() => stepDecision(1)} disabled={isGuest} class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 transition {isGuest ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">+</button>
          </div>
        </div>
        <!-- Match Limit Stepper -->
        <div class="bg-white rounded-xl p-2 border border-slate-200 flex flex-col justify-between">
          <span class="text-[11px] font-black uppercase text-slate-600 tracking-tight">Match Limit</span>
          <div class="flex items-center justify-between mt-1">
            <button onclick={() => stepDuration(-1)} disabled={isGuest} class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 transition {isGuest ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">-</button>
            <span id="setup-match-duration-text" class="text-xs font-black text-slate-900 font-mono">{state.matchDuration || 15} min</span>
            <button onclick={() => stepDuration(1)} disabled={isGuest} class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 transition {isGuest ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">+</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Section Card: Board & World -->
    <div class="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 space-y-3 shadow-2xs">
      <div class="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        <i class="fa-solid fa-earth-americas text-sky-500"></i> Board &amp; Atmosphere
      </div>

      <!-- Map Edition -->
      <div>
        <div class="flex justify-between items-center mb-1.5">
          <span class="text-xs font-black text-slate-700">Map Edition</span>
          <span id="lobby-edition-tiles-text" class="text-[10px] font-bold text-slate-400">
            {state.boardEdition === 'rajasthan' ? '32 Royal Cities' : '32 Cities'}
          </span>
        </div>
        <div class="grid grid-cols-2 gap-1.5 bg-slate-200/60 p-1 rounded-xl">
          <button
            id="setup-edition-world"
            onclick={() => setEdition('world')}
            disabled={isGuest}
            class="py-1.5 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 {state.boardEdition !== 'rajasthan' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'} {isGuest ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}"
          >
            🌍 World
          </button>
          <button
            id="setup-edition-rajasthan"
            onclick={() => setEdition('rajasthan')}
            disabled={isGuest}
            class="py-1.5 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 {state.boardEdition === 'rajasthan' ? 'bg-sky-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'} {isGuest ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}"
          >
            🏰 Rajasthan
          </button>
        </div>
      </div>

      <!-- Board Style & Atmosphere Twin Row -->
      <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/70">
        <!-- Board Style -->
        <div class="bg-white rounded-xl p-2 border border-slate-200 flex flex-col justify-between">
          <span class="text-[11px] font-black uppercase text-slate-600 tracking-tight mb-1">Style</span>
          <div class="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg">
            {#each [{ id: 'wood', icon: '🪵', label: 'Wood' }, { id: 'cyberpunk', icon: '⚡', label: 'Cyber' }, { id: 'elegant', icon: '✨', label: 'Elegant' }] as styleOpt}
              <button
                id="setup-board-{styleOpt.id}"
                onclick={() => setStyle(styleOpt.id)}
                disabled={isGuest}
                class="py-1 rounded-md text-[11px] font-black transition cursor-pointer flex items-center justify-center {state.boardStyle === styleOpt.id ? 'bg-sky-500 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'} {isGuest ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}"
                title={styleOpt.label}
              >
                {styleOpt.icon}
              </button>
            {/each}
          </div>
        </div>
        <!-- Atmosphere Stepper -->
        <div class="bg-white rounded-xl p-2 border border-slate-200 flex flex-col justify-between">
          <span class="text-[11px] font-black uppercase text-slate-600 tracking-tight mb-1">Lighting</span>
          <div class="flex items-center justify-between">
            <button onclick={() => stepAtmo(-1)} disabled={isGuest || isCyber} class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 transition {(isGuest || isCyber) ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">-</button>
            <span id="setup-atmosphere-text" class="text-xs font-black text-slate-900 font-mono truncate px-0.5">
              {getAtmoLabel(state.lightingTheme)}
            </span>
            <button onclick={() => stepAtmo(1)} disabled={isGuest || isCyber} class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 transition {(isGuest || isCyber) ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}">+</button>
          </div>
          <span id="setup-atmosphere-desc" class="hidden"></span>
        </div>
      </div>
    </div>
  </div>

  <!-- Board Edition Info Badge -->
  <div class="pt-2 border-t border-sky-100 flex items-center justify-between text-xs text-slate-500 font-bold">
    <span>Map: <strong id="lobby-edition-badge-text" class="text-sky-700">{state.boardEdition === 'rajasthan' ? 'Rajasthan Edition' : 'World Tour Edition'}</strong></span>
    <span class="text-[11px] text-slate-400 font-semibold">Standard Board</span>
  </div>
</div>
