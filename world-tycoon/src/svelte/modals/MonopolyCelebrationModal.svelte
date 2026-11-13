<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.monopolyCelebration || {}; });

  function onClose() {
    if (typeof window !== 'undefined' && typeof window.closeMonopolyModal === 'function') {
      window.closeMonopolyModal();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  id="modal-monopoly-celebration"
  onclick={onClose}
  class="fixed inset-0 z-[9999] items-center justify-center p-4 select-none cursor-pointer overscroll-contain overflow-y-auto {state.visible ? 'flex' : 'hidden'}"
>
  <!-- Deep Dimmed Backdrop with Sunburst Rays -->
  <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity duration-300"></div>
  <div class="monopoly-sunburst-rays pointer-events-none"></div>

  <!-- Main Floating Celebration Stage -->
  <div
    id="modal-monopoly-card"
    class="relative z-10 flex flex-col items-center max-w-xl w-full pointer-events-auto cursor-default font-ui"
    onclick={(e) => e.stopPropagation()}
  >
    <!-- Player Avatar Hero Disc -->
    <div id="monopoly-avatar-disc" class="monopoly-avatar-disc shadow-2xl" style="box-shadow: 0 0 0 4px #fff, 0 0 0 8px {state.playerColor || '#ef4444'}55, 0 16px 36px rgba(0,0,0,.45)">
      <div id="monopoly-avatar-fallback" class="w-full h-full flex flex-col items-center justify-center text-white">
        <span id="monopoly-avatar-icon" class="text-3xl sm:text-4xl drop-shadow">{state.avatarIcon || '🎩'}</span>
        <span id="monopoly-avatar-initial" class="text-xs sm:text-sm font-black uppercase tracking-wider drop-shadow-sm mt-0.5">{state.avatarInitial || 'YOU'}</span>
      </div>
    </div>

    <!-- Property Deed Cards Container -->
    <div id="monopoly-cards-row" class="monopoly-cards-row flex flex-wrap items-center justify-center gap-3 my-4">
      {#if state.deedCards && state.deedCards.length > 0}
        {#each state.deedCards as card}
          <div class="w-32 sm:w-36 rounded-2xl bg-slate-950/95 border-2 border-white/20 p-2 text-white shadow-xl flex flex-col items-center text-center">
            <div class="w-full py-1 rounded-lg font-mono font-black text-[10px] uppercase tracking-wider mb-2" style="background:{card.colorHex}; color: #ffffff;">
              {state.groupName || 'DISTRICT'}
            </div>
            <div class="font-display font-black text-xs text-white truncate w-full mb-1">{card.name}</div>
            <div class="text-[11px] font-mono font-black text-amber-300">{card.rentFormatted || '2× RENT'}</div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- 3D Swallowtail Ribbon Banner -->
    <div class="relative z-20 w-full max-w-lg px-2 flex flex-col items-center">
      <div class="monopoly-ribbon-wrapper">
        <div class="monopoly-ribbon-tail-left"></div>
        <div class="monopoly-ribbon-fold-left"></div>

        <div class="monopoly-ribbon-plate">
          <h2 id="monopoly-ribbon-title" class="monopoly-ribbon-headline">
            MONOPOLY!
          </h2>
          <p id="monopoly-ribbon-subtitle" class="monopoly-ribbon-subline">
            <span id="monopoly-winner-name" class="font-black text-slate-900">{state.winnerName || 'Player'}</span> completed a color group: rents doubled!
          </p>
        </div>

        <div class="monopoly-ribbon-fold-right"></div>
        <div class="monopoly-ribbon-tail-right"></div>
      </div>

      <button
        onclick={onClose}
        class="monopoly-dismiss-pill mt-3 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
      >
        Tap anywhere to continue
      </button>
    </div>
  </div>
</div>
