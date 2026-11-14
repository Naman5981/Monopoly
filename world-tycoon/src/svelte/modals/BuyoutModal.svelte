<script>
  import { modalStore } from '../stores/modalStore.js';
  import ActionChipShell from '../components/ActionChipShell.svelte';

  let state = $state({});
  modalStore.subscribe(val => { state = val.buyout || {}; });

  function onConfirm() {
    window.confirmBuyoutCity?.();
  }

  function onPass() {
    window.passBuyoutCity?.();
  }
</script>

<ActionChipShell modalId="modal-buyout-city" cardId="modal-buyout-city-card" visible={state.visible} borderColor="border-rose-500/80">
  <!-- Top Summary Line -->
  <div class="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
    <div class="flex items-center gap-2 truncate">
      <span class="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-600 to-rose-800 text-white font-black shadow-sm shrink-0">
        ⚔️ BUYOUT
      </span>
      <h3 id="buyout-modal-name" class="font-display font-black text-sm sm:text-base tracking-wide text-white truncate">
        {state.tile?.name || 'CITY'}
      </h3>
      <span id="buyout-modal-owner" class="text-[11px] font-bold text-slate-300 truncate">
        From {state.sellerName || 'Opponent'}
      </span>
    </div>
    <div class="flex items-center gap-1.5 text-xs font-black text-right shrink-0">
      <span class="text-slate-400">Cost:</span>
      <span id="buyout-modal-total-cost" class="text-rose-400 font-extrabold">{state.buyoutCostFormatted || '$0'}</span>
    </div>
  </div>

  <!-- Hidden compatibility elements for tests and scripts -->
  <span id="buyout-modal-base-price" class="hidden">{state.basePriceFormatted || '$0'}</span>
  <span id="buyout-modal-houses-cost" class="hidden">{state.housesCostFormatted || '$0'}</span>
  <span id="buyout-modal-balance" class="hidden">{state.buyerBalanceFormatted || '$0'}</span>

  {#if state.isMonopolyFinisher}
    <div class="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/25 via-yellow-400/20 to-amber-500/25 border border-amber-400/50 flex items-center justify-between text-xs shadow-inner">
      <span class="font-black text-amber-300 flex items-center gap-1.5">
        <span class="text-sm">👑</span>
        <span>MONOPOLY FINISHER!</span>
      </span>
      <span class="text-[11px] font-extrabold text-amber-200">
        Doubles all district rent (2×)!
      </span>
    </div>
  {/if}

  <!-- Action Buttons Row -->
  <div class="flex items-center gap-2 pt-0.5">
    <button id="btn-confirm-buyout" onclick={onConfirm} disabled={!state.canAfford} class="game-btn game-btn-orange flex-1 py-2.5 px-3 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md {!state.canAfford ? 'opacity-50 cursor-not-allowed' : ''}">
      <i class="fa-solid fa-handshake-slash"></i>
      <span>ACQUIRE CITY</span>
      <span class="text-xs font-bold opacity-90">({state.buyoutCostFormatted || '$0'})</span>
    </button>

    <button id="btn-pass-buyout" onclick={onPass} class="game-btn game-btn-slate py-2.5 px-4 text-xs font-black shrink-0">
      PASS ({state.secondsLeft || 12}s) ✕
    </button>
  </div>
</ActionChipShell>
