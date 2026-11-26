<script>
  import { onMount } from 'svelte';
  import { hudStore } from '../stores/hudStore.js';
  import { setEmpireSpotlight } from '../../three/scene.js';

  let state = $state({});
  let activeSpotlightPlayerId = $state(null);
  hudStore.subscribe(val => { state = val; });

  function onEmpireHover(playerId) {
    if (activeSpotlightPlayerId !== null) return;
    if (typeof setEmpireSpotlight === 'function') {
      setEmpireSpotlight(playerId);
    } else if (typeof window !== 'undefined' && window.setEmpireSpotlight) {
      window.setEmpireSpotlight(playerId);
    }
  }

  function onEmpireLeave() {
    if (activeSpotlightPlayerId !== null) return;
    if (typeof setEmpireSpotlight === 'function') {
      setEmpireSpotlight(null);
    } else if (typeof window !== 'undefined' && window.setEmpireSpotlight) {
      window.setEmpireSpotlight(null);
    }
  }

  function toggleEmpireSpotlight(playerId) {
    if (activeSpotlightPlayerId === playerId) {
      activeSpotlightPlayerId = null;
      if (typeof setEmpireSpotlight === 'function') {
        setEmpireSpotlight(null);
      } else if (typeof window !== 'undefined' && window.setEmpireSpotlight) {
        window.setEmpireSpotlight(null);
      }
    } else {
      activeSpotlightPlayerId = playerId;
      if (typeof setEmpireSpotlight === 'function') {
        setEmpireSpotlight(playerId);
      } else if (typeof window !== 'undefined' && window.setEmpireSpotlight) {
        window.setEmpireSpotlight(playerId);
      }
    }
  }

  onMount(() => {
    function onDocClick(e) {
      if (activeSpotlightPlayerId !== null && !e.target.closest?.('.player-hud-card')) {
        activeSpotlightPlayerId = null;
        if (typeof setEmpireSpotlight === 'function') {
          setEmpireSpotlight(null);
        } else if (typeof window !== 'undefined' && window.setEmpireSpotlight) {
          window.setEmpireSpotlight(null);
        }
      }
    }
    window.addEventListener('click', onDocClick);
    return () => {
      window.removeEventListener('click', onDocClick);
    };
  });
</script>

<!-- Left Players Column -->
<div id="hud-left-players" class="fixed left-3 sm:left-5 z-30 hidden flex flex-col gap-4 sm:gap-4.5 pointer-events-auto">
  {#each state.leftPlayers || [] as player (player.id)}
    <div class="player-hud-wrapper flex items-center {player.bankrupt ? 'opacity-35 grayscale' : (player.isCurrent ? 'opacity-100' : 'opacity-90 hover:opacity-100')} transition-opacity duration-150">
      <div
        id="hud-card-{player.id}"
        class="player-hud-card hud-ticket-c cursor-pointer transition-all duration-200 {player.isCurrent ? 'active-turn-hud is-turn' : ''} {player.inIsland ? 'in-island-detention is-jail' : ''} {activeSpotlightPlayerId === player.id ? 'is-spotlight scale-105' : 'hover:scale-[1.02]'}"
        style="--player-accent: {player.colorHex || '#3b82f6'}; --player-color: {player.colorHex || '#3b82f6'};"
        onmouseenter={() => onEmpireHover(player.id)}
        onmouseleave={onEmpireLeave}
        onfocus={() => onEmpireHover(player.id)}
        onblur={onEmpireLeave}
        onclick={() => toggleEmpireSpotlight(player.id)}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleEmpireSpotlight(player.id); } }}
        role="button"
        tabindex="0"
        title="Click or hover to highlight {player.name}'s empire on the board"
      >
        <!-- Protruding 3D Avatar Coin Medallion -->
        <div class="avatar-frame relative z-40">
          <div class="avatar-inner clay-avatar">
            <canvas id="hud-avatar-canvas-{player.id}" width="104" height="104" class="w-full h-full block rounded-full"></canvas>
          </div>
        </div>

        <!-- Split-Deck Ticket Body -->
        <div class="body-shell relative z-10">
          <!-- Top Identity Deck (100% Flooded with Player Color) -->
          <div class="deck-top hud-header-row">
            <div class="name-col flex items-center gap-1.5 min-w-0 flex-shrink-0">
              <span class="hud-player-name name-text font-black text-white text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap">
                {player.name}
              </span>
            </div>
            <div class="hud-turn-badge flex items-center gap-1 flex-shrink-0">
              {#if player.isCurrent}
                <span class="turn-badge-live">TURN</span>
              {:else if player.inIsland}
                <span class="role-badge jail-badge" style="background: rgba(0,0,0,0.32);" title="Island Detention (Turn {player.islandTurns || 0}/3)">
                  <i class="fa-solid fa-lock text-[10px] mr-0.5"></i>JAIL {player.islandTurns || 0}/3
                </span>
              {:else if player.isPartner}
                <span class="role-badge" style="background: rgba(16, 185, 129, 0.85);">ALLY</span>
              {:else if player.isSelf}
                <span class="role-badge">YOU</span>
              {:else if player.isHost}
                <span class="role-badge" style="background: rgba(245, 158, 11, 0.85);">HOST</span>
              {:else if player.isAI}
                <span class="role-badge" style="background: rgba(0, 0, 0, 0.28);">BOT</span>
              {:else}
                <span class="role-badge">P{player.id + 1}</span>
              {/if}
            </div>
          </div>

          <!-- Bottom Economy Deck (High-Contrast Solid White Shelf) -->
          <div class="deck-bottom hud-cash-row">
            <div class="cash-block flex items-baseline gap-1">
              <span id="hud-cash-val-{player.id}" class="hud-cash-amount cash-amount font-black font-brand text-slate-900 tracking-tight text-sm sm:text-base">
                ${player.cashFormatted ?? '0'}
              </span>
            </div>
            <span class="hud-cash-icon cash-bundle-icon flex items-center" title="Cash">💵</span>
          </div>
        </div>
      </div>
    </div>
  {/each}

  {#if state.isTeamMode && (state.leftPlayers || []).length > 0}
    {@const leftColor = (state.leftPlayers && state.leftPlayers[0]?.teamId !== undefined) ? (state.leftPlayers[0].teamId === 0 ? '#ef4444' : '#3b82f6') : (state.leftTeamColor || '#ef4444')}
    <div
      class="team-networth-pill mt-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-xs border-2 shadow-md text-slate-800"
      style="border-color: {leftColor};"
    >
      <span class="w-2.5 h-2.5 rounded-full shadow-xs flex-shrink-0 animate-pulse" style="background-color: {leftColor};"></span>
      <div class="flex flex-col">
        <span class="text-[10px] font-black uppercase tracking-wider leading-none" style="color: {leftColor};">{state.leftTeamLabel || 'TEAM RED'}</span>
        <span class="text-xs font-black font-mono text-slate-900 leading-normal mt-0.5">{state.leftTeamNetWorth || '$0'}</span>
      </div>
    </div>
  {/if}
</div>

<!-- Right Players Column -->
<div id="hud-right-players" class="fixed right-3 sm:right-5 z-30 hidden flex flex-col gap-4 sm:gap-4.5 items-end pointer-events-auto">
  {#each state.rightPlayers || [] as player (player.id)}
    <div class="player-hud-wrapper flex items-center {player.bankrupt ? 'opacity-35 grayscale' : (player.isCurrent ? 'opacity-100' : 'opacity-90 hover:opacity-100')} transition-opacity duration-150">
      <div
        id="hud-card-{player.id}"
        class="player-hud-card hud-ticket-c mirrored cursor-pointer transition-all duration-200 {player.isCurrent ? 'active-turn-hud is-turn' : ''} {player.inIsland ? 'in-island-detention is-jail' : ''} {activeSpotlightPlayerId === player.id ? 'is-spotlight scale-105' : 'hover:scale-[1.02]'}"
        style="--player-accent: {player.colorHex || '#3b82f6'}; --player-color: {player.colorHex || '#3b82f6'};"
        onmouseenter={() => onEmpireHover(player.id)}
        onmouseleave={onEmpireLeave}
        onfocus={() => onEmpireHover(player.id)}
        onblur={onEmpireLeave}
        onclick={() => toggleEmpireSpotlight(player.id)}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleEmpireSpotlight(player.id); } }}
        role="button"
        tabindex="0"
        title="Click or hover to highlight {player.name}'s empire on the board"
      >
        <!-- Protruding 3D Avatar Coin Medallion -->
        <div class="avatar-frame relative z-40">
          <div class="avatar-inner clay-avatar">
            <canvas id="hud-avatar-canvas-{player.id}" width="104" height="104" class="w-full h-full block rounded-full"></canvas>
          </div>
        </div>

        <!-- Split-Deck Ticket Body (Mirrored on Right Column) -->
        <div class="body-shell relative z-10">
          <!-- Top Identity Deck (100% Flooded with Player Color) -->
          <div class="deck-top hud-header-row">
            <div class="name-col flex items-center gap-1.5 min-w-0 flex-shrink-0">
              <span class="hud-player-name name-text font-black text-white text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap">
                {player.name}
              </span>
            </div>
            <div class="hud-turn-badge flex items-center gap-1 flex-shrink-0">
              {#if player.isCurrent}
                <span class="turn-badge-live">TURN</span>
              {:else if player.inIsland}
                <span class="role-badge jail-badge" style="background: rgba(0,0,0,0.32);" title="Island Detention (Turn {player.islandTurns || 0}/3)">
                  <i class="fa-solid fa-lock text-[10px] mr-0.5"></i>JAIL {player.islandTurns || 0}/3
                </span>
              {:else if player.isPartner}
                <span class="role-badge" style="background: rgba(16, 185, 129, 0.85);">ALLY</span>
              {:else if player.isSelf}
                <span class="role-badge">YOU</span>
              {:else if player.isHost}
                <span class="role-badge" style="background: rgba(245, 158, 11, 0.85);">HOST</span>
              {:else if player.isAI}
                <span class="role-badge" style="background: rgba(0, 0, 0, 0.28);">BOT</span>
              {:else}
                <span class="role-badge">P{player.id + 1}</span>
              {/if}
            </div>
          </div>

          <!-- Bottom Economy Deck (High-Contrast Solid White Shelf) -->
          <div class="deck-bottom hud-cash-row">
            <div class="cash-block flex items-baseline gap-1">
              <span id="hud-cash-val-{player.id}" class="hud-cash-amount cash-amount font-black font-brand text-slate-900 tracking-tight text-sm sm:text-base">
                ${player.cashFormatted ?? '0'}
              </span>
            </div>
            <span class="hud-cash-icon cash-bundle-icon flex items-center" title="Cash">💵</span>
          </div>
        </div>
      </div>
    </div>
  {/each}

  {#if state.isTeamMode && (state.rightPlayers || []).length > 0}
    {@const rightColor = (state.rightPlayers && state.rightPlayers[0]?.teamId !== undefined) ? (state.rightPlayers[0].teamId === 0 ? '#ef4444' : '#3b82f6') : (state.rightTeamColor || '#3b82f6')}
    <div
      class="team-networth-pill mt-1 flex items-center justify-end gap-2 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-xs border-2 shadow-md text-slate-800"
      style="border-color: {rightColor};"
    >
      <div class="flex flex-col text-right">
        <span class="text-[10px] font-black uppercase tracking-wider leading-none" style="color: {rightColor};">{state.rightTeamLabel || 'TEAM BLUE'}</span>
        <span class="text-xs font-black font-mono text-slate-900 leading-normal mt-0.5">{state.rightTeamNetWorth || '$0'}</span>
      </div>
      <span class="w-2.5 h-2.5 rounded-full shadow-xs flex-shrink-0 animate-pulse" style="background-color: {rightColor};"></span>
    </div>
  {/if}
</div>
