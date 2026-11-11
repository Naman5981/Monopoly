<script>
  /**
   * svelte/lobby/PlayerSetupCards.svelte
   * Declarative player cards roster for match lobby setup (Local & Multiplayer).
   */
  import { lobbyStore } from '../stores/lobbyStore.js';

  function selectPlayer(idx) {
    if (typeof window !== 'undefined' && window.selectSetupPlayer) {
      window.selectSetupPlayer(idx);
    }
  }

  function toggleRole(idx, e) {
    e.stopPropagation();
    if (typeof window !== 'undefined' && window.togglePlayerRole) {
      window.togglePlayerRole(idx);
    }
  }

  function removeSlot(idx, e) {
    e.stopPropagation();
    if (typeof window !== 'undefined' && window.removePlayerAt) {
      window.removePlayerAt(idx);
    }
  }

  function onNameChange(idx, val) {
    if (typeof window !== 'undefined' && window.handlePlayerNameChange) {
      window.handlePlayerNameChange(idx, val);
    }
  }
</script>

<div class="player-cards-grid flex flex-col gap-2 w-full">
  {#each ($lobbyStore?.players || []) as p, idx (p.idx ?? idx)}
    <div
      role="button"
      tabindex="0"
      onclick={() => selectPlayer(idx)}
      onkeydown={(e) => e.key === 'Enter' && selectPlayer(idx)}
      class="player-setup-card group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border-2 transition-all cursor-pointer {idx === $lobbyStore.selectedPlayerIdx ? 'card-selected bg-white border-sky-400 shadow-md ring-2 ring-sky-300/40' : 'bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300'}"
    >
      <!-- Left: Avatar Medallion + Name -->
      <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div
          class="avatar-medallion w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center font-black text-sm text-slate-800 shadow-xs flex-shrink-0"
          style="border-color: {p.colorHex || '#10b981'}; background: {p.colorHex ? p.colorHex + '20' : '#10b98120'}; color: {p.colorHex || '#10b981'};"
        >
          {(p.name || 'P')[0]?.toUpperCase() || 'P'}
        </div>

        <div class="flex flex-col min-w-0">
          {#if p.canEditName}
            <input
              type="text"
              value={p.name}
              maxlength="12"
              onclick={(e) => e.stopPropagation()}
              oninput={(e) => onNameChange(idx, e.currentTarget.value)}
              class="font-black text-xs sm:text-sm text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none transition-all truncate"
              placeholder="Name..."
            />
          {:else}
            <span class="font-black text-xs sm:text-sm text-slate-800 truncate">{p.name}</span>
          {/if}
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {p.isOnlinePeer ? 'Online Peer' : (p.isAI ? 'Computer AI' : 'Human Player')}
          </span>
        </div>
      </div>

      <!-- Right: Action Badges & Role Controls -->
      <div class="flex items-center gap-1.5 flex-shrink-0">
        {#if p.isHost && p.isSelf}
          <span class="text-[11px] font-black px-2 py-0.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">HOST</span>
        {:else if p.isConnectedPeer}
          <span class="text-[11px] font-black px-2 py-0.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>ONLINE</span>
          </span>
        {:else}
          <button
            type="button"
            onclick={(e) => toggleRole(idx, e)}
            class="text-[11px] font-black px-2 py-0.5 rounded-xl border transition cursor-pointer {p.isAI ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200' : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 shadow-2xs'}"
            title="Toggle Human / Bot"
          >
            {p.isAI ? 'Bot' : 'Player'}
          </button>

          {#if idx > 0 && ($lobbyStore.playerCount || 4) > 2}
            <button
              type="button"
              onclick={(e) => removeSlot(idx, e)}
              class="w-6 h-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition cursor-pointer shadow-2xs"
              title="Remove Player Slot"
            >
              ✕
            </button>
          {/if}
        {/if}
      </div>
    </div>
  {/each}
</div>
