<script>
  /**
   * svelte/lobby/LobbyRoster.svelte
   * Declarative left-column roster: Table players count badge, player setup cards list, and add/randomize actions.
   */
  import { lobbyStore } from "../stores/lobbyStore.js";
  import PlayerSetupCards from "./PlayerSetupCards.svelte";
  import { animateTelemetryBadgePop } from "../../ui/anim/lobby.js";

  let state = $state({});
  lobbyStore.subscribe((val) => {
    state = val;
  });

  const playerCount = $derived(state.players?.length || state.playerCount || 4);

  let prevBalanceValid = null;
  $effect(() => {
    const cur = state.isTeamBalanceValid;
    if (
      state.isTeamMode &&
      prevBalanceValid !== null &&
      prevBalanceValid !== cur
    ) {
      animateTelemetryBadgePop("#table-player-count-badge");
    }
    prevBalanceValid = cur;
  });

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

<div
  id="lobby-roster-column"
  class="col-span-12 lg:col-span-4 game-panel-card p-3.5 sm:p-5 2xl:p-6 flex flex-col justify-between shadow-xl min-h-[460px] lg:min-h-[500px] 2xl:min-h-[560px]"
>
  <div class="flex-1 flex flex-col">
    <!-- Header -->
    <div
      class="flex items-center justify-between border-b-2 border-sky-100 pb-3 mb-3 flex-shrink-0"
    >
      <div
        class="flex items-center gap-2.5 font-black text-sm sm:text-base 2xl:text-lg text-[#0284c7] uppercase tracking-wide"
      >
        <i
          class="fa-solid {state.isTeamMode
            ? 'fa-shield-halved'
            : 'fa-users'} text-sky-500 text-lg"
        ></i>
        <span>{state.isTeamMode ? "TEAM ALLIANCE" : "TABLE PLAYERS"}</span>
      </div>
      <div
        id="table-player-count-badge"
        class="px-3 py-1 rounded-full font-black text-xs sm:text-sm border shadow-2xs flex items-center gap-1.5 {state.isTeamMode
          ? state.isTeamBalanceValid
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
            : 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse'
          : 'bg-sky-100 text-sky-700 border-sky-200'}"
      >
        {#if state.isTeamMode}
          <span class="text-[10px] font-black uppercase tracking-wider"
            >{state.isTeamBalanceValid
              ? playerCount === 6
                ? "3v3 READY"
                : "2v2 READY"
              : "UNBALANCED"}</span
          >
        {/if}
        <span>{playerCount}/6</span>
      </div>
    </div>

    <!-- Roster list with Svelte 5 PlayerSetupCards -->
    <div id="setup-players-roster" class="space-y-2.5 flex-1">
      <PlayerSetupCards />
    </div>
  </div>

  <!-- Add bot / Remove bot / Randomize actions -->
  <div class="pt-3 border-t-2 border-sky-100 space-y-2 flex-shrink-0 mt-3">
    <div class="flex gap-2">
      <button
        onclick={addBot}
        disabled={playerCount >= 6}
        class="flex-1 py-3 rounded-2xl font-rounded font-black text-xs sm:text-sm text-white game-btn game-btn-blue shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <i class="fa-solid fa-plus text-xs"></i> Add Player / Bot
      </button>
      <button
        onclick={removeBot}
        disabled={playerCount <= 2}
        class="w-12 py-3 rounded-2xl font-rounded font-black text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer shadow-xs flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        title="Remove last player"
        aria-label="Remove last player"
      >
        <i class="fa-solid fa-minus"></i>
      </button>
    </div>
    <button
      onclick={randomizeNames}
      class="w-full py-2.5 rounded-2xl font-rounded font-extrabold text-xs text-sky-700 bg-sky-50/80 hover:bg-sky-100 border border-sky-200 transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs active:scale-98"
      title="Randomize names of all AI Bots at the table"
    >
      <i class="fa-solid fa-dice text-sky-500"></i> Randomize Bot Names
    </button>
  </div>
</div>
