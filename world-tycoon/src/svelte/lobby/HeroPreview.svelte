<script>
  /**
   * svelte/lobby/HeroPreview.svelte
   * Declarative 3D Hero stage, archetype switcher, candy color swatches, and game mode cards.
   */
  import { lobbyStore } from '../stores/lobbyStore.js';
  import LobbyNetworkStatus from './LobbyNetworkStatus.svelte';

  const CANDY_PALETTE = [
    { hex: '#ef4444', name: 'Ruby Red' },
    { hex: '#3b82f6', name: 'Sky Blue' },
    { hex: '#22c55e', name: 'Lawn Green' },
    { hex: '#84cc16', name: 'Lime' },
    { hex: '#8b5cf6', name: 'Purple' },
    { hex: '#fb923c', name: 'Peach' },
    { hex: '#ec4899', name: 'Pink' },
    { hex: '#06b6d4', name: 'Turquoise' }
  ];

  let state = $state({});
  lobbyStore.subscribe(val => { state = val; });

  const activePlayer = $derived(
    state.players?.[state.selectedPlayerIdx || 0] || state.players?.[0] || {}
  );

  function prevArchetype() {
    window.cycleAvatarPrev?.();
  }

  function nextArchetype() {
    window.cycleAvatarNext?.();
  }

  function selectColor(hex) {
    window.setLocalPlayerColor?.(hex);
  }

  function openWardrobe() {
    window.openWardrobeModal?.();
  }

  function editName() {
    window.promptEditPlayerName?.();
  }

  function startLocal() {
    window.showLocalSetup?.();
  }

  function startMultiplayer() {
    window.showMultiplayerSetup?.();
  }

  function dismissHeadsUp() {
    window.dismissNameHeadsUp?.(true);
  }
</script>

<div id="lobby-hero-column" class="col-span-12 lg:col-span-4 flex flex-col items-center justify-between min-h-[460px] lg:min-h-[500px] 2xl:min-h-[560px] py-1 relative">
  <!-- Sunburst Radial Halo with Depth Glow -->
  <div class="lobby-podium-halo"></div>

  <!-- Hero 3D Stage Section with Integrated Archetype Badge Dock -->
  <div id="lobby-hero-stage-group" class="relative z-20 flex flex-col items-center justify-center my-auto w-full">
    <!-- Archetype Selector Header Anchored Above 3D Model -->
    <div class="flex items-center justify-center gap-2 sm:gap-2.5 mb-1 sm:mb-1.5">
      <button id="setup-archetype-carousel-prev" onclick={prevArchetype} class="game-circle-btn bg-white hover:bg-slate-50 text-sky-600 font-black text-sm shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95" title="Previous Archetype" aria-label="Previous Archetype">
        <i class="fa-solid fa-chevron-left text-xs sm:text-sm"></i>
      </button>
      <div id="setup-character-archetype-name" class="px-4 sm:px-5 py-1 sm:py-1.5 rounded-full bg-white/95 text-slate-900 font-black text-xs sm:text-sm shadow-md border-2 border-white flex items-center gap-1.5 cursor-pointer hover:bg-white select-none transition-transform hover:scale-[1.02] active:scale-[0.98]" onclick={nextArchetype} title="Click to cycle next archetype">
        <span>{state.archetypeIcon || '🎩'}</span>
        <span class="tracking-wide">{state.archetypeName || 'BANKER'}</span>
      </div>
      <button id="setup-archetype-carousel-next" onclick={nextArchetype} class="game-circle-btn bg-white hover:bg-slate-50 text-sky-600 font-black text-sm shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95" title="Next Archetype" aria-label="Next Archetype">
        <i class="fa-solid fa-chevron-right text-xs sm:text-sm"></i>
      </button>
    </div>

    <!-- 3D Canvas Stage -->
    <div id="lobby-avatar-3d-canvas-wrapper" class="relative flex items-center justify-center">
      <canvas id="lobby-avatar-3d-canvas" width="512" height="512" class="w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] lg:w-[270px] lg:h-[270px] 2xl:w-[330px] 2xl:h-[330px] pointer-events-auto relative z-10"></canvas>
    </div>
  </div>

  <!-- Bottom Controls: Default Setup Mode -->
  <div class="lobby-hero-default-controls relative z-20 flex flex-col items-center gap-2 sm:gap-2.5 2xl:gap-3 w-full">
    <!-- Customization Row: Wardrobe & Colors Unified Capsule Dock -->
    <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center bg-white/80 backdrop-blur-md p-1.5 rounded-full border-2 border-white/90 shadow-md">
      <!-- Wardrobe & Outfits Button -->
      <button id="btn-open-wardrobe" onclick={openWardrobe} class="px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-amber-300 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-xs border border-amber-300 flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.96]" title="Customize Outfits, Hats, Dice & Pedestals" aria-label="Open Wardrobe Customization">
        <svg class="ui-icon w-3.5 h-3.5 text-slate-950 flex-shrink-0" aria-hidden="true"><use href="#icon-wardrobe"></use></svg>
        <span class="tracking-wide text-[11px] font-black uppercase">WARDROBE</span>
        <span class="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-300 font-black text-[10px] tabular-nums inline-flex items-center gap-1 shadow-inner">
          <svg class="ui-icon w-2.5 h-2.5 text-amber-300" aria-hidden="true"><use href="#icon-star"></use></svg>
          <span id="wardrobe-button-stars-badge" class="font-mono tabular-nums text-[10px] font-black">{state.profileStars ?? 500}</span>
        </span>
      </button>

      <!-- Color Swatches Bar -->
      <div id="setup-color-swatches-container" class="flex items-center gap-1 px-1">
        <span class="text-[9px] sm:text-[10px] font-black uppercase text-slate-500 tracking-wider mr-0.5">COLOR</span>
        <div id="setup-color-swatches" class="flex items-center gap-1 sm:gap-1.5">
          {#each CANDY_PALETTE as candy}
            {@const isSelected = (activePlayer.colorHex || '').toLowerCase() === candy.hex.toLowerCase()}
            <button
              onclick={() => selectColor(candy.hex)}
              class="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center {isSelected ? 'scale-115 border-white ring-2 ring-sky-400 shadow-sm' : 'border-white/80 hover:scale-105'}"
              style="background-color: {candy.hex};"
              title="{candy.name}"
              aria-label="Select {candy.name}"
            >
              {#if isSelected}
                <i class="fa-solid fa-check text-[9px] text-white drop-shadow"></i>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </div>

    {#if state.currentView === 'title'}
      <!-- A. Title Screen Primary Menu (LOCAL vs MULTIPLAYER) -->
      <div id="title-menu-actions" class="w-full max-w-sm lg:max-w-md 2xl:max-w-lg flex flex-col items-center gap-2 sm:gap-2.5 2xl:gap-3.5 mt-0.5 relative z-30 pointer-events-auto">
        <!-- First-Time Name Heads Up Notification Banner -->
        {#if !state.isNameHeadsUpDismissed}
          <div id="home-name-heads-up" class="w-full rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 p-3 sm:p-3.5 shadow-xl border-2 border-white flex flex-col gap-1.5 relative">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <span class="w-5 h-5 rounded-full bg-slate-950 text-amber-300 flex items-center justify-center text-[10px] shadow-inner flex-shrink-0">
                  <i class="fa-solid fa-lightbulb"></i>
                </span>
                <span class="font-black text-[11px] sm:text-xs uppercase tracking-wider text-slate-950">Heads Up! Tycoon Name</span>
              </div>
              <button onclick={dismissHeadsUp} class="w-5 h-5 rounded-full bg-slate-950/10 hover:bg-slate-950/20 text-slate-800 flex items-center justify-center text-xs cursor-pointer transition" title="Dismiss" aria-label="Dismiss name change hint">
                <i class="fa-solid fa-xmark text-[10px]"></i>
              </button>
            </div>
            <p class="text-[11px] sm:text-xs font-bold text-slate-900 leading-snug">
              You can customize your player name right here on the Home Screen! Once you enter Local or Multiplayer lobbies, names are locked.
            </p>
            <div class="flex items-center gap-2 mt-0.5">
              <button onclick={() => { editName(); dismissHeadsUp(); }} class="flex-1 py-1.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-300 font-black text-xs flex items-center justify-center gap-1 shadow-md cursor-pointer transition">
                <i class="fa-solid fa-pen text-[9px]"></i> Change Name
              </button>
              <button onclick={dismissHeadsUp} class="py-1.5 px-3 rounded-xl bg-white/90 hover:bg-white text-slate-900 font-black text-xs shadow-2xs border border-white cursor-pointer transition">
                Got It!
              </button>
            </div>
          </div>
        {/if}

        <!-- Tycoon Profile Quick Card on Home Screen -->
        <div class="w-full max-w-sm sm:max-w-md mx-auto flex items-center justify-between px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/95 border-2 border-amber-300/80 shadow-xs">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
            <span class="text-[10px] sm:text-[11px] font-black uppercase text-amber-800 tracking-wider flex-shrink-0">YOUR NAME:</span>
            <strong id="home-tycoon-name-display" class="text-xs sm:text-sm font-black text-slate-800 uppercase truncate">
              {state.activeDisplayName || 'TYCOON'}
            </strong>
          </div>
          <button onclick={editName} class="px-2.5 sm:px-3 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-black text-[11px] sm:text-xs cursor-pointer transition shadow-2xs flex items-center gap-1 flex-shrink-0" title="Edit your Tycoon name" aria-label="Edit Tycoon Name">
            <i class="fa-solid fa-pen text-[9px] sm:text-[10px]"></i>
            <span>EDIT</span>
          </button>
        </div>

        <!-- Game Mode Cards -->
        <div id="title-game-modes-grid" class="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 lg:gap-3.5">
          <!-- Local Play Button -->
          <button onclick={startLocal} class="w-full py-2.5 sm:py-3 lg:py-3.5 2xl:py-4 px-4 sm:px-5 lg:px-6 2xl:px-7 rounded-2xl font-rounded font-black text-white game-btn game-btn-green shadow-lg flex items-center justify-between group cursor-pointer transition-[transform,box-shadow] duration-150 ease-out hover:scale-[1.02] enabled:active:scale-[0.96]" title="Play solo against bots or pass-and-play" aria-label="Play Local Mode with Bots">
            <div class="flex items-center gap-2.5 sm:gap-3 lg:gap-3.5 min-w-0">
              <div class="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-base sm:text-lg lg:text-xl shadow-inner border border-white/30 flex-shrink-0">
                <i class="fa-solid fa-gamepad text-white"></i>
              </div>
              <div class="text-left min-w-0">
                <div class="text-sm sm:text-base lg:text-lg font-black leading-tight tracking-wider truncate">LOCAL PLAY</div>
                <div class="text-[9px] sm:text-[10px] font-extrabold text-emerald-100 uppercase tracking-widest truncate">Pass &amp; Play + Bots</div>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right text-emerald-200 text-xs group-hover:translate-x-1 transition-transform flex-shrink-0 ml-1"></i>
          </button>

          <!-- Multiplayer Button -->
          <button onclick={startMultiplayer} class="w-full py-2.5 sm:py-3 lg:py-3.5 2xl:py-4 px-4 sm:px-5 lg:px-6 2xl:px-7 rounded-2xl font-rounded font-black text-white game-btn game-btn-blue shadow-lg flex items-center justify-between group cursor-pointer transition-[transform,box-shadow] duration-150 ease-out hover:scale-[1.02] enabled:active:scale-[0.96]" title="Host private room or join via room code" aria-label="Play Multiplayer Online via Room Code">
            <div class="flex items-center gap-2.5 sm:gap-3 lg:gap-3.5 min-w-0">
              <div class="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-base sm:text-lg lg:text-xl shadow-inner border border-white/30 flex-shrink-0">
                <i class="fa-solid fa-globe text-white"></i>
              </div>
              <div class="text-left min-w-0">
                <div class="text-sm sm:text-base lg:text-lg font-black leading-tight tracking-wider truncate">MULTIPLAYER</div>
                <div class="text-[9px] sm:text-[10px] font-extrabold text-sky-100 uppercase tracking-widest truncate">Online via Room Code</div>
              </div>
            </div>
            <i class="fa-solid fa-chevron-right text-sky-200 text-xs group-hover:translate-x-1 transition-transform flex-shrink-0 ml-1"></i>
          </button>
        </div>
      </div>
    {:else}
      <!-- B. Lobby Setup Actions (START MATCH & Multiplayer Room Hero Capsule) -->
      <div id="lobby-setup-actions" class="w-full max-w-sm flex flex-col items-center gap-2.5 mt-1">
        <LobbyNetworkStatus variant="room" />
        <LobbyNetworkStatus variant="play" />
      </div>
    {/if}
  </div>
</div>
