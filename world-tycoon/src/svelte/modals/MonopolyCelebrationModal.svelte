<script>
  import { modalStore } from '../stores/modalStore.js';
  import { hudStore } from '../stores/hudStore.js';
  import { fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';

  let state = $state({});
  let hud = $state({});
  let isAuctionActive = $state(false);
  modalStore.subscribe(val => {
    state = val.monopolyCelebration || {};
    isAuctionActive = Boolean(val.auction?.visible);
  });
  hudStore.subscribe(val => { hud = val || {}; });

  const isDarkTheme = $derived(hud.lightingMode === 'Night' || hud.boardStyle === 'cyberpunk');

  function onClose() {
    if (typeof window !== 'undefined' && typeof window.closeMonopolyModal === 'function') {
      window.closeMonopolyModal();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && state.visible) {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  id="modal-monopoly-celebration"
  onclick={onClose}
  class="fixed inset-0 z-[1250] pointer-events-auto select-none cursor-pointer overscroll-contain {state.visible ? 'block' : 'hidden'}"
>
  <!-- Zero Blackout: Transparent click catcher to dismiss anywhere without darkening 3D board -->
  <div class="absolute inset-0 bg-transparent" aria-hidden="true"></div>

  <!-- Bottom Action Dock (or Top Dock during active Auction): Playfield Aligned, Dual-Hue Semantic Palette -->
  <div
    id="modal-monopoly-card"
    class="fixed {isAuctionActive ? 'top-16 sm:top-20' : 'bottom-4 sm:bottom-6'} left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-3xl z-20 pointer-events-auto cursor-default font-ui"
    onclick={(e) => e.stopPropagation()}
    transition:fly={{ duration: 380, y: isAuctionActive ? -40 : 40, easing: backOut }}
  >
    <div
      class="relative w-full rounded-2xl border-2 p-3 sm:p-4 shadow-2xl flex flex-col backdrop-blur-sm {isDarkTheme ? 'bg-slate-950/95 text-white' : 'bg-white text-slate-900'}"
      style="border-color: {state.groupColor || '#f59e0b'}; box-shadow: 0 16px 48px rgba(0, 0, 0, {isDarkTheme ? '0.7' : '0.22'}), 0 0 28px {state.groupColor || '#f59e0b'}40;"
    >
      <!-- Main Content Row -->
      <div class="w-full flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        <!-- Left: Winner Identity + District Badge -->
        <div class="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div
            id="monopoly-avatar-disc"
            class="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-md border border-white/60 shrink-0"
            style="background: {state.playerColor || '#ef4444'};"
          >
            <span id="monopoly-avatar-icon" class="leading-none">{state.avatarIcon || '🎩'}</span>
            <span id="monopoly-avatar-initial" class="hidden">{state.avatarInitial || 'YOU'}</span>
          </div>

          <div class="flex flex-col">
            <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span id="monopoly-ribbon-title" class="font-display font-black text-sm sm:text-base tracking-wide uppercase flex items-center gap-1 {isDarkTheme ? 'text-amber-300' : 'text-amber-600'}">
                🏆 MONOPOLY!
              </span>
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider text-white shadow-sm"
                style="background: {state.groupColor || '#38bdf8'}; text-shadow: 0 1px 2px rgba(0,0,0,0.5);"
              >
                {state.groupName || 'DISTRICT'}
              </span>
            </div>
            <p id="monopoly-ribbon-subtitle" class="text-xs font-bold mt-0.5 {isDarkTheme ? 'text-slate-200' : 'text-slate-600'}">
              <span id="monopoly-winner-name" class="font-black {isDarkTheme ? 'text-white' : 'text-slate-900'}">{state.winnerName || 'Player'}</span> &bull; <span class="font-extrabold uppercase tracking-wide {isDarkTheme ? 'text-amber-300' : 'text-amber-700'}">All District Rents Doubled (2×)</span>
            </p>
          </div>
        </div>

        <!-- Right: Deed Chips Row + Direct Close Button -->
        <div class="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <div id="monopoly-cards-row" class="min-w-0 flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5">
            {#if state.deedCards && state.deedCards.length > 0}
              {#each state.deedCards as card}
                <div class="flex-1 min-w-[78px] sm:min-w-[88px] max-w-[130px] py-1.5 px-2 rounded-xl border flex flex-col items-center text-center shadow-inner {isDarkTheme ? 'bg-slate-900/90 border-white/15' : 'bg-slate-50 border-slate-200'}" style="border-top: 3px solid {state.groupColor || '#f59e0b'};">
                  <span class="text-[11px] font-black truncate max-w-[120px] {isDarkTheme ? 'text-white' : 'text-slate-900'}">{card.name}</span>
                  <span class="text-[10px] sm:text-[11px] font-mono font-black mt-0.5 whitespace-nowrap {isDarkTheme ? 'text-amber-300' : 'text-emerald-700'}">
                    ⚡ {card.rentFormatted || '2× RENT'}
                  </span>
                </div>
              {/each}
            {/if}
          </div>

          <!-- Crisp Single Close Button -->
          <button
            id="monopoly-close-btn"
            type="button"
            onclick={onClose}
            class="w-7 h-7 rounded-full active:scale-95 transition flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer ml-1 {isDarkTheme ? 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'}"
            aria-label="Dismiss celebration"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Bottom Hint Bar -->
      <div class="w-full mt-2 pt-1.5 border-t flex items-center justify-between text-[10px] font-medium {isDarkTheme ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-500'}">
        <span>Tap anywhere or press ESC to dismiss</span>
        <span class="font-mono uppercase tracking-wider text-[10px] {isDarkTheme ? 'text-slate-500' : 'text-slate-400'}">Auto-closing</span>
      </div>

      <!-- Depleting Progress Bar (District Color Harmonized) -->
      <div class="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden {isDarkTheme ? 'bg-slate-900' : 'bg-slate-200'}">
        <div
          class="h-full rounded-full"
          style="background: {state.groupColor || '#f59e0b'}; animation: monopolyTimerDeplete 4.5s linear forwards;"
        ></div>
      </div>
    </div>
  </div>
</div>
