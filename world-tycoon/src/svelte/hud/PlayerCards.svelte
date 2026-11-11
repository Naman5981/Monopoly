<script>
  import { hudStore } from '../stores/hudStore.js';

  let state = $state({});
  hudStore.subscribe(val => { state = val; });
</script>

<!-- Left Players Column -->
<div id="hud-left-players" class="fixed left-3 sm:left-5 z-30 hidden flex flex-col gap-2.5 sm:gap-3 pointer-events-auto">
  {#each state.leftPlayers || [] as player (player.id)}
    <div class="player-hud-wrapper flex items-center {player.bankrupt ? 'opacity-35 grayscale' : (player.isCurrent ? 'opacity-100' : 'opacity-90 hover:opacity-100')} transition-opacity duration-150">
      <div id="hud-card-{player.id}" class="player-hud-card {player.isCurrent ? 'active-turn-hud' : ''} {player.inIsland ? 'in-island-detention' : ''}">
        <div class="avatar-circle" style="box-shadow: 0 0 0 2.5px {player.colorHex || '#3b82f6'}, 0 4px 10px rgba(0,0,0,0.12);">
          <canvas id="hud-avatar-canvas-{player.id}" width="104" height="104" class="w-full h-full block"></canvas>
        </div>
        <div class="hud-info-col">
          <div class="hud-header-row">
            <span class="hud-player-name">{player.name}</span>
            <span class="hud-island-icon">
              {#if player.inIsland}
                <span class="hud-detention-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/50 text-amber-900 font-black text-[9px] tracking-wider shadow-2xs" title="In Island Detention (Turn {player.islandTurns || 0}/3)"><i class="fa-solid fa-lock text-[8px] text-amber-700"></i> JAIL {player.islandTurns || 0}/3</span>
              {/if}
            </span>
            <span class="hud-turn-badge">
              {#if player.isCurrent}
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-[10px] tracking-wider shadow-2xs border border-amber-300 animate-pulse"><span class="w-1.5 h-1.5 rounded-full bg-slate-950"></span> TURN</span>
              {:else if player.isAI}
                <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">BOT</span>
              {:else if player.isSelf}
                <span class="text-[9px] font-black uppercase tracking-wider text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-md border border-sky-200">YOU</span>
              {:else if player.isHost}
                <span class="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">HOST</span>
              {:else}
                <span class="text-[9px] font-black uppercase tracking-wider text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200">P{player.id + 1}</span>
              {/if}
            </span>
          </div>
          <div class="hud-cash-row">
            <span id="hud-cash-val-{player.id}" class="hud-cash-amount">{player.cashFormatted || '$0'}</span>
            <span class="hud-cash-icon" title="Cash">💵</span>
          </div>
        </div>

        {#if player.inIsland}
          <div class="island-iron-bars">
            <div class="island-bar-rod"></div>
            <div class="island-bar-rod"></div>
            <div class="island-bar-rod"></div>
            <div class="island-bar-rod"></div>
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>

<!-- Right Players Column -->
<div id="hud-right-players" class="fixed right-3 sm:right-5 z-30 hidden flex flex-col gap-2.5 sm:gap-3 items-end pointer-events-auto">
  {#each state.rightPlayers || [] as player (player.id)}
    <div class="player-hud-wrapper flex items-center {player.bankrupt ? 'opacity-35 grayscale' : (player.isCurrent ? 'opacity-100' : 'opacity-90 hover:opacity-100')} transition-opacity duration-150">
      <div id="hud-card-{player.id}" class="player-hud-card {player.isCurrent ? 'active-turn-hud' : ''} {player.inIsland ? 'in-island-detention' : ''}">
        <div class="hud-info-col items-end text-right">
          <div class="hud-header-row justify-end">
            <span class="hud-turn-badge">
              {#if player.isCurrent}
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-[10px] tracking-wider shadow-2xs border border-amber-300 animate-pulse"><span class="w-1.5 h-1.5 rounded-full bg-slate-950"></span> TURN</span>
              {:else if player.isAI}
                <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">BOT</span>
              {:else if player.isSelf}
                <span class="text-[9px] font-black uppercase tracking-wider text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-md border border-sky-200">YOU</span>
              {:else if player.isHost}
                <span class="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">HOST</span>
              {:else}
                <span class="text-[9px] font-black uppercase tracking-wider text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200">P{player.id + 1}</span>
              {/if}
            </span>
            <span class="hud-island-icon">
              {#if player.inIsland}
                <span class="hud-detention-badge inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/50 text-amber-900 font-black text-[9px] tracking-wider shadow-2xs" title="In Island Detention (Turn {player.islandTurns || 0}/3)"><i class="fa-solid fa-lock text-[8px] text-amber-700"></i> JAIL {player.islandTurns || 0}/3</span>
              {/if}
            </span>
            <span class="hud-player-name">{player.name}</span>
          </div>
          <div class="hud-cash-row justify-end">
            <span class="hud-cash-icon" title="Cash">💵</span>
            <span id="hud-cash-val-{player.id}" class="hud-cash-amount">{player.cashFormatted || '$0'}</span>
          </div>
        </div>
        <div class="avatar-circle" style="box-shadow: 0 0 0 2.5px {player.colorHex || '#3b82f6'}, 0 4px 10px rgba(0,0,0,0.12);">
          <canvas id="hud-avatar-canvas-{player.id}" width="104" height="104" class="w-full h-full block"></canvas>
        </div>

        {#if player.inIsland}
          <div class="island-iron-bars">
            <div class="island-bar-rod"></div>
            <div class="island-bar-rod"></div>
            <div class="island-bar-rod"></div>
            <div class="island-bar-rod"></div>
          </div>
        {/if}
      </div>
    </div>
  {/each}
</div>
