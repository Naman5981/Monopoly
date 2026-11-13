<script>
  /**
   * svelte/lobby/LobbyRoster.svelte
   * Declarative left-column roster: Table players count badge, player setup cards list, and add/randomize actions.
   */
  import { lobbyStore } from '../stores/lobbyStore.js';
  import PlayerSetupCards from './PlayerSetupCards.svelte';

  let state = $state({});
  lobbyStore.subscribe(val => { state = val; });

  const playerCount = $derived(state.players?.length || state.playerCount || 4);

  function addBot() {
    window.addBotOrSlot?.();
  }

  function removeBot() {
    window.removeBotOrSlot?.();
  }

  function randomizeNames() {
    window.randomizeAllNames?.();
  }
</script>

<div id="lobby-roster-column" class="col-span-12 lg:col-span-4 game-panel-card p-3.5 sm:p-5 2xl:p-6 flex flex-col justify-between shadow-xl min-h-[460px] lg:min-h-[500px] 2xl:min-h-[560px]">
  <div class="flex-1 flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between border-b-2 border-sky-100 pb-3 mb-3 flex-shrink-0">
      <div class="flex items-center gap-2.5 font-black text-sm sm:text-base 2xl:text-lg text-[#0284c7] uppercase tracking-wide">
        <i class="fa-solid fa-users text-sky-500 text-lg"></i> TABLE PLAYERS
      </div>
      <div id="table-player-count-badge" class="px-3 py-1 rounded-full bg-sky-100 text-sky-700 font-black text-xs sm:text-sm border border-sky-200">
        {playerCount}/6
      </div>
    </div>

    <!-- Roster list with Svelte 5 PlayerSetupCards -->
    <div id="setup-players-roster" class="space-y-2.5 flex-1">
      <PlayerSetupCards />
    </div>
  </div>

  <!-- Add bot / Remove bot / Randomize actions -->
  <div class="pt-3.5 border-t-2 border-sky-100 space-y-2 flex-shrink-0 mt-3">
    <div class="flex gap-2.5">
      <button onclick={addBot} class="flex-1 py-3.5 rounded-full font-rounded font-black text-sm text-white game-btn game-btn-blue shadow-md">
        <i class="fa-solid fa-plus text-xs"></i> Add Player / Bot
      </button>
      <button onclick={removeBot} class="px-4 py-3.5 rounded-full font-rounded font-black text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer shadow-xs" title="Remove last player" aria-label="Remove last player">
        <i class="fa-solid fa-minus"></i>
      </button>
    </div>
    <button onclick={randomizeNames} class="w-full py-2.5 rounded-full font-rounded font-bold text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition cursor-pointer flex items-center justify-center gap-2" title="Randomize names of all AI Bots at the table">
      <i class="fa-solid fa-robot text-sky-500"></i> Randomize Bot Names
    </button>
  </div>
</div>
