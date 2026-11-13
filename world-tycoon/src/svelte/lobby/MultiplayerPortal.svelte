<script>
  /**
   * svelte/lobby/MultiplayerPortal.svelte
   * Declarative multiplayer choice portal: Create Room or Join Room via code.
   */
  import { lobbyStore } from '../stores/lobbyStore.js';
  import LobbyNetworkStatus from './LobbyNetworkStatus.svelte';

  let state = $state({});
  lobbyStore.subscribe(val => { state = val; });

  let enteredCode = $state('');

  function hostRoom() {
    window.hostP2PRoom?.();
  }

  function joinRoom() {
    const input = document.getElementById('input-p2p-room-code-portal');
    const oldInput = document.getElementById('input-p2p-room-code');
    if (input && oldInput) {
      oldInput.value = input.value.toUpperCase();
    }
    window.joinP2PRoomFromPortal?.();
  }
</script>

<div id="lobby-multiplayer-portal" class="col-span-12 max-w-3xl mx-auto w-full my-auto py-6 flex flex-col gap-4">
  <!-- Player Identity Banner -->
  <div class="game-panel-card p-4 sm:p-5 shadow-lg border-2 border-sky-200 bg-white/95 flex flex-col sm:flex-row items-center justify-between gap-3">
    <div class="flex items-center gap-3 w-full sm:w-auto">
      <div id="portal-profile-avatar" class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md border-2 border-white flex-shrink-0">
        {(state.activeDisplayName || 'T')[0]?.toUpperCase() || 'T'}
      </div>
      <div>
        <div class="text-[10px] font-black uppercase tracking-wider text-sky-600">Your Tycoon Identity</div>
        <div class="text-xs font-semibold text-slate-500">Visible to all players across online rooms</div>
      </div>
    </div>
    <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
      <div class="flex items-center gap-2.5 bg-slate-50 border-2 border-slate-200 px-3.5 py-2 rounded-xl">
        <span id="portal-profile-name-display" class="font-black text-sm uppercase text-slate-800 tracking-wide select-none">
          {state.activeDisplayName || 'TYCOON'}
        </span>
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black tracking-wider shadow-2xs" title="Names can only be changed on the Home Screen">
          <i class="fa-solid fa-lock text-[9px] text-amber-700"></i> LOCKED IN LOBBY
        </span>
      </div>
      <input id="portal-player-name-input" type="hidden" value={state.activeDisplayName || 'TYCOON'} />
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch">
    <!-- Host Room Card -->
    <div class="game-panel-card p-6 sm:p-7 flex flex-col justify-between shadow-xl border-2 border-sky-300 border-b-4 border-b-sky-500 bg-white">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center text-xl shadow-md border-2 border-white/80 flex-shrink-0">
            <i class="fa-solid fa-crown text-amber-300"></i>
          </div>
          <div>
            <span class="text-[10px] font-black uppercase tracking-wider text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">Host Lobby</span>
            <h3 class="font-display font-black text-2xl text-slate-900 tracking-wide leading-tight">Create Room</h3>
          </div>
        </div>
        <p class="text-xs sm:text-sm font-medium text-slate-600">Start a private match and share the invite code with your friends.</p>

        <div class="flex flex-wrap gap-1.5 pt-1">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
            <i class="fa-solid fa-users text-sky-600 text-[11px]"></i> Up to 6 Players
          </span>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
            <i class="fa-solid fa-link text-indigo-600 text-[11px]"></i> Invite Link
          </span>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
            <i class="fa-solid fa-robot text-emerald-600 text-[11px]"></i> Bot Fill
          </span>
        </div>
      </div>

      <button onclick={hostRoom} class="mt-6 w-full py-4 rounded-2xl font-rounded font-black text-lg text-white game-btn game-btn-blue shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]">
        <i class="fa-solid fa-plus text-base"></i>
        <span>CREATE ROOM</span>
      </button>
    </div>

    <!-- Join Room Card -->
    <div class="game-panel-card p-6 sm:p-7 flex flex-col justify-between shadow-xl border-2 border-emerald-300 border-b-4 border-b-emerald-500 bg-white">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xl shadow-md border-2 border-white/80 flex-shrink-0">
            <i class="fa-solid fa-arrow-right-to-bracket"></i>
          </div>
          <div>
            <span class="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Join Lobby</span>
            <h3 class="font-display font-black text-2xl text-slate-900 tracking-wide leading-tight">Join Room</h3>
          </div>
        </div>
        <p class="text-xs sm:text-sm font-medium text-slate-600">Enter the room code shared by your friend to jump into their game.</p>

        <div class="space-y-1.5 pt-1">
          <div class="relative">
            <input
              id="input-p2p-room-code-portal"
              type="text"
              maxlength="6"
              placeholder="ROOM CODE"
              bind:value={enteredCode}
              oninput={(e) => {
                const val = e.currentTarget.value.toUpperCase();
                enteredCode = val;
                const oldInput = document.getElementById('input-p2p-room-code');
                if (oldInput) oldInput.value = val;
              }}
              onkeydown={(e) => e.key === 'Enter' && joinRoom()}
              class="w-full text-center uppercase tracking-[0.25em] text-2xl font-mono font-black py-3 px-4 rounded-2xl border-2 border-slate-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 bg-slate-50 focus:bg-white outline-none transition text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans placeholder:font-bold placeholder:text-sm"
            />
          </div>
          <LobbyNetworkStatus variant="portal" />
        </div>
      </div>

      <button onclick={joinRoom} class="mt-4 w-full py-4 rounded-2xl font-rounded font-black text-lg text-white game-btn game-btn-green shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]">
        <i class="fa-solid fa-gamepad text-base"></i>
        <span>JOIN GAME</span>
      </button>
    </div>
  </div>
</div>
