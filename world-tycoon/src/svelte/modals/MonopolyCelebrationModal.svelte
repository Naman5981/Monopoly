<script>
  import { modalStore } from '../stores/modalStore.js';
  import { fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';

  let state = $state({});
  modalStore.subscribe(val => { state = val.monopolyCelebration || {}; });

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

  <!-- Bottom Action Dock: Playfield Aligned, Dual-Hue Semantic Palette -->
  <div
    id="modal-monopoly-card"
    class="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl z-20 pointer-events-auto cursor-default font-ui"
    onclick={(e) => e.stopPropagation()}
    transition:fly={{ duration: 380, y: 40, easing: backOut }}
  >
    <div
      class="relative w-full rounded-2xl bg-slate-950/95 border-2 p-3 sm:p-4 text-white shadow-2xl flex flex-col backdrop-blur-sm"
      style="border-color: {state.groupColor || '#f59e0b'}; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7), 0 0 28px {state.groupColor || '#f59e0b'}40;"
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
              <span id="monopoly-ribbon-title" class="font-display font-black text-sm sm:text-base text-amber-300 tracking-wide uppercase flex items-center gap-1">
                🏆 MONOPOLY!
              </span>
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider text-white shadow-sm"
                style="background: {state.groupColor || '#38bdf8'}; text-shadow: 0 1px 2px rgba(0,0,0,0.5);"
              >
                {state.groupName || 'DISTRICT'}
              </span>
            </div>
            <p id="monopoly-ribbon-subtitle" class="text-xs font-bold text-slate-200 mt-0.5">
              <span id="monopoly-winner-name" class="text-white font-black">{state.winnerName || 'Player'}</span> &bull; <span class="text-amber-300 font-extrabold uppercase tracking-wide">All District Rents Doubled (2×)</span>
            </p>
          </div>
        </div>

        <!-- Right: Deed Chips Row + Direct Close Button -->
        <div class="flex items-center gap-2">
          <div id="monopoly-cards-row" class="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5">
            {#if state.deedCards && state.deedCards.length > 0}
              {#each state.deedCards as card}
                <div class="flex-1 min-w-[85px] sm:min-w-[105px] py-1.5 px-2 rounded-xl bg-slate-900/90 border border-white/15 flex flex-col items-center text-center shadow-inner">
                  <span class="text-[11px] font-black text-white truncate max-w-[120px]">{card.name}</span>
                  <span class="text-[10px] sm:text-[11px] font-mono font-black text-amber-300 mt-0.5 whitespace-nowrap">
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
            class="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition flex items-center justify-center text-slate-300 hover:text-white text-xs font-bold shrink-0 cursor-pointer ml-1"
            aria-label="Dismiss celebration"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Bottom Hint Bar (Single clean hint, no duplicate dismiss buttons) -->
      <div class="w-full mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-medium">
        <span>Tap anywhere or press ESC to dismiss</span>
        <span class="font-mono text-slate-500 uppercase tracking-wider text-[10px]">Auto-closing</span>
      </div>

      <!-- Depleting Progress Bar (District Color Harmonized) -->
      <div class="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden bg-slate-900">
        <div
          class="h-full rounded-full"
          style="background: {state.groupColor || '#f59e0b'}; animation: monopolyTimerDeplete 4.5s linear forwards;"
        ></div>
      </div>
    </div>
  </div>
</div>
