<script>
  /**
   * svelte/lobby/PlayerSetupCards.svelte
   * Declarative player cards roster for match lobby setup (Local & Multiplayer).
   */
  import { lobbyStore } from "../stores/lobbyStore.js";
  import {
    animateTeamPillToggle,
    animateTeamClashEntrance,
  } from "../../ui/anim/lobby.js";

  let prevTeamMode = false;
  $effect(() => {
    const isTeam = $lobbyStore?.isTeamMode;
    if (isTeam && !prevTeamMode) {
      setTimeout(() => {
        animateTeamClashEntrance();
      }, 20);
    }
    prevTeamMode = Boolean(isTeam);
  });

  const redPlayers = $derived(
    ($lobbyStore?.players || []).filter((p) => p.teamId === 0),
  );
  const bluePlayers = $derived(
    ($lobbyStore?.players || []).filter((p) => p.teamId === 1),
  );

  function selectPlayer(idx) {
    if (typeof window !== "undefined" && window.selectSetupPlayer) {
      window.selectSetupPlayer(idx);
    }
  }

  function toggleRole(idx, e) {
    e.stopPropagation();
    if (typeof window !== "undefined" && window.togglePlayerRole) {
      window.togglePlayerRole(idx);
    }
  }

  function removeSlot(idx, e) {
    e.stopPropagation();
    if (typeof window !== "undefined" && window.removePlayerAt) {
      window.removePlayerAt(idx);
    }
  }

  function toggleTeam(idx, e) {
    e.stopPropagation();
    animateTeamPillToggle(e.currentTarget);
    if (typeof window !== "undefined" && window.togglePlayerTeam) {
      window.togglePlayerTeam(idx);
    }
  }

  function onNameChange(idx, val) {
    if (typeof window !== "undefined" && window.handlePlayerNameChange) {
      window.handlePlayerNameChange(idx, val);
    }
  }
</script>

{#snippet playerCard(p)}
  {@const idx = p.idx}
  {@const isSelected = idx === $lobbyStore.selectedPlayerIdx}
  {@const isTeam = $lobbyStore.isTeamMode}
  {@const isRed = p.teamId === 0}
  <div
    role="button"
    tabindex="0"
    onclick={() => selectPlayer(idx)}
    onkeydown={(e) => e.key === 'Enter' && selectPlayer(idx)}
    class="player-setup-card group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border-2 transition-all cursor-pointer {isSelected
      ? (isTeam
          ? (isRed
              ? 'card-selected bg-rose-50/70 border-rose-400 shadow-sm ring-2 ring-rose-400/50'
              : 'card-selected bg-sky-50/70 border-sky-400 shadow-sm ring-2 ring-sky-400/50')
          : 'card-selected bg-sky-50/70 border-sky-400 shadow-sm ring-2 ring-sky-400/50')
      : (isTeam
          ? (isRed
              ? 'bg-white border-rose-200/90 hover:border-rose-300 shadow-2xs'
              : 'bg-white border-sky-200/90 hover:border-sky-300 shadow-2xs')
          : 'bg-white border-slate-200/90 hover:border-sky-300 shadow-2xs')}"
  >
    <!-- Left: Tactile Token Medallion + Name + Archetype Badge -->
    <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
      <!-- 3D Token Medallion with Color Swatch Ring -->
      <div class="relative flex-shrink-0">
        <div
          class="avatar-medallion w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center font-black text-sm shadow-xs transition-transform group-hover:scale-105"
          style="border-color: {p.colorHex || '#10b981'}; background: radial-gradient(circle at 35% 35%, {p.colorHex || '#10b981'}33 0%, {p.colorHex || '#10b981'}15 100%);"
        >
          <span class="text-base select-none leading-none drop-shadow-xs">{p.archetypeIcon || '🎩'}</span>
        </div>
        <!-- Candy Color Dot Indicator -->
        <span
          class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs"
          style="background-color: {p.colorHex || '#10b981'};"
          title="Player Token Color"
        ></span>
      </div>

      <div class="flex flex-col min-w-0">
        <div class="flex items-center gap-1.5">
          {#if p.canEditName}
            <input
              type="text"
              value={p.name}
              maxlength="12"
              onclick={(e) => e.stopPropagation()}
              oninput={(e) => onNameChange(idx, e.currentTarget.value)}
              class="font-black text-xs sm:text-sm text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none transition-all truncate leading-tight py-0"
              placeholder="Name..."
            />
          {:else}
            <span class="font-black text-xs sm:text-sm text-slate-900 truncate leading-tight">{p.name}</span>
          {/if}
          {#if p.isHost && p.isSelf}
            <span class="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-amber-200 text-amber-950 border border-amber-300 shadow-2xs leading-none">👑 HOST</span>
          {/if}
        </div>
        <div class="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wide mt-0.5">
          <span class="text-slate-500">{p.isOnlinePeer ? 'Online' : (p.isAI ? 'Bot' : 'Human')}</span>
          <span class="text-slate-300">•</span>
          <span class="text-slate-800 font-extrabold">{p.archetypeName || 'Banker'}</span>
        </div>
      </div>
    </div>

    <!-- Right: Action Badges & Role Controls -->
    <div class="flex items-center gap-1.5 flex-shrink-0">
      {#if $lobbyStore.isTeamMode}
        <button
          type="button"
          onclick={(e) => toggleTeam(idx, e)}
          class="text-xs font-black px-2.5 py-1 rounded-xl border-2 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1 {p.teamId === 0 ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100' : 'bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100'}"
          title="Click to switch Team (Red ↔ Blue)"
        >
          <span>{p.teamId === 0 ? '🔴 RED' : '🔵 BLUE'}</span>
        </button>
      {/if}

      {#if p.isConnectedPeer}
        <span class="text-[11px] font-black px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>ONLINE</span>
        </span>
      {:else if !p.isHost || !p.isSelf}
        <button
          type="button"
          onclick={(e) => toggleRole(idx, e)}
          class="text-xs font-black px-2.5 py-1 rounded-xl border-2 transition cursor-pointer active:scale-95 {p.isAI ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200' : 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100 shadow-2xs'}"
          title="Toggle Human / Bot"
        >
          <i class="fa-solid {p.isAI ? 'fa-robot' : 'fa-user'} mr-1 text-[10px]"></i>
          {p.isAI ? 'Bot' : 'Player'}
        </button>

        {#if idx > 0 && ($lobbyStore.playerCount || 4) > 2}
          <button
            type="button"
            onclick={(e) => removeSlot(idx, e)}
            class="w-7 h-7 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300 flex items-center justify-center transition cursor-pointer shadow-2xs active:scale-90 text-xs font-black"
            title="Remove Player Slot"
          >
            ✕
          </button>
        {/if}
      {/if}
    </div>
  </div>
{/snippet}

{#if !$lobbyStore.isTeamMode}
  <div class="player-cards-grid flex flex-col gap-2 w-full">
    {#each $lobbyStore?.players || [] as p (p.idx)}
      {@render playerCard(p)}
    {/each}
  </div>
{:else}
  <!-- Team Mode Alliance Clash Split -->
  <div class="team-clash-roster flex flex-col gap-2.5 w-full">
    <!-- Red Alliance Bracket -->
    <div
      class="team-bracket team-bracket-red bg-rose-50/50 border-2 border-rose-200/90 rounded-2xl p-2 sm:p-2.5 flex flex-col gap-1.5 shadow-2xs transition-all"
    >
      <div class="flex items-center justify-between px-1.5 py-0.5">
        <span
          class="text-xs font-black uppercase text-rose-700 tracking-wider flex items-center gap-1.5"
        >
          <span
            class="w-2 h-2 rounded-full bg-rose-500 shadow-2xs animate-pulse"
          ></span>
          TEAM RED
        </span>
        <span
          class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/95 text-rose-700 border border-rose-200 shadow-2xs"
        >
          {redPlayers.length}
          {redPlayers.length === 1 ? "Player" : "Players"}
        </span>
      </div>
      <div class="flex flex-col gap-1.5">
        {#each redPlayers as p (p.idx)}
          {@render playerCard(p)}
        {/each}
        {#if redPlayers.length === 0}
          <div
            class="text-[11px] font-bold text-rose-400 text-center py-2.5 border-2 border-dashed border-rose-200/80 rounded-xl bg-white/40"
          >
            No players on Team Red
          </div>
        {/if}
      </div>
    </div>

    <!-- Clash VS Divider -->
    <div
      class="team-clash-divider flex items-center justify-center gap-2 py-0.5"
    >
      <div
        class="flex-1 h-0.5 bg-gradient-to-r from-transparent via-rose-300 to-amber-300"
      ></div>
      <div
        class="px-2.5 py-1 rounded-full bg-slate-900 text-amber-300 text-[10px] font-black uppercase tracking-widest shadow-xs flex items-center gap-1.5 border border-amber-400/40"
      >
        <i class="fa-solid fa-bolt text-[9px] text-amber-400"></i>
        <span>VS</span>
        <i class="fa-solid fa-bolt text-[9px] text-amber-400"></i>
      </div>
      <div
        class="flex-1 h-0.5 bg-gradient-to-r from-amber-300 via-sky-300 to-transparent"
      ></div>
    </div>

    <!-- Blue Alliance Bracket -->
    <div
      class="team-bracket team-bracket-blue bg-sky-50/50 border-2 border-sky-200/90 rounded-2xl p-2 sm:p-2.5 flex flex-col gap-1.5 shadow-2xs transition-all"
    >
      <div class="flex items-center justify-between px-1.5 py-0.5">
        <span
          class="text-xs font-black uppercase text-sky-700 tracking-wider flex items-center gap-1.5"
        >
          <span class="w-2 h-2 rounded-full bg-sky-500 shadow-2xs animate-pulse"
          ></span>
          TEAM BLUE
        </span>
        <span
          class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/95 text-sky-700 border border-sky-200 shadow-2xs"
        >
          {bluePlayers.length}
          {bluePlayers.length === 1 ? "Player" : "Players"}
        </span>
      </div>
      <div class="flex flex-col gap-1.5">
        {#each bluePlayers as p (p.idx)}
          {@render playerCard(p)}
        {/each}
        {#if bluePlayers.length === 0}
          <div
            class="text-[11px] font-bold text-sky-400 text-center py-2.5 border-2 border-dashed border-sky-200/80 rounded-xl bg-white/40"
          >
            No players on Team Blue
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
