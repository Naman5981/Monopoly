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

  function handleWindowKeydown(e) {
    if (!state.visible) return;
    if (e.target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable)) return;
    if (e.key === 'Enter') {
      if (state.canAfford) {
        e.preventDefault();
        onConfirm();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onPass();
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<ActionChipShell modalId="modal-buyout-city" cardId="modal-buyout-city-card" visible={state.visible} borderColor="border-rose-500/80">
  <!-- Top Summary Line -->
  <div class="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
    <div class="flex items-center gap-2 truncate min-w-0">
      <span class="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-600 to-rose-800 text-white font-black shadow-sm shrink-0 flex items-center gap-1.5">
        <i class="fa-solid fa-handshake-slash text-xs" aria-hidden="true"></i>
        <span>BUYOUT</span>
      </span>
      <span class="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0" style="background-color: {state.colorHex || '#f43f5e'};"></span>
      <h3 id="buyout-modal-name" class="font-display font-black text-sm sm:text-base tracking-wide text-white truncate drop-shadow-xs">
        {state.cityName || state.tile?.name || 'CITY'}
      </h3>
      <span id="buyout-modal-owner" class="text-xs font-black px-2 py-0.5 rounded-full bg-white/20 text-slate-100 border border-white/40 shadow-xs shrink-0">
        From {state.sellerName || 'Opponent'}
      </span>
    </div>
    <div class="flex items-center gap-1.5 text-xs font-black text-right shrink-0">
      <span class="text-slate-400">Cost:</span>
      <span id="buyout-modal-total-cost" class="text-rose-400 font-extrabold">{state.buyoutCostFormatted || '$0'}</span>
    </div>
  </div>

  <!-- Takeover Badge & Tax Breakdown -->
  <div class="flex items-center justify-between text-[11px] font-bold px-1 text-slate-300">
    <span class="px-2 py-0.5 rounded-full {state.isFinalTakeover ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 font-black' : 'bg-white/10 text-slate-300'}">
      {state.takeoverBadge || 'TAKEOVER 1/2'}
    </span>
    <span class="text-slate-400">
      Seller gets: <strong class="text-emerald-300">{state.sellerPayoutFormatted || '$0'}</strong> • Bank Tax: <strong class="text-rose-400">{state.bankFeeFormatted || '$0'}</strong>
    </span>
  </div>

  <!-- Hidden compatibility elements for tests and scripts -->
  <span id="buyout-modal-base-price" class="hidden">{state.basePriceFormatted || '$0'}</span>
  <span id="buyout-modal-houses-cost" class="hidden">{state.housesCostFormatted || '$0'}</span>
  <span id="buyout-modal-balance" class="hidden">{state.buyerBalanceFormatted || '$0'}</span>

  {#if state.isMonopolyFinisher}
    <div class="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/25 via-yellow-400/20 to-amber-500/25 border border-amber-400/50 flex items-center justify-between text-xs shadow-inner">
      <span class="font-black text-amber-300 flex items-center gap-1.5">
        <i class="fa-solid fa-crown text-amber-400 text-xs" aria-hidden="true"></i>
        <span>MONOPOLY FINISHER!</span>
      </span>
      <span class="text-xs font-extrabold text-amber-200">
        Doubles all district rent (2×)!
      </span>
    </div>
  {/if}

  <!-- Action Buttons Row -->
  <div class="flex items-center gap-2 pt-0.5">
    <button id="btn-confirm-buyout" onclick={onConfirm} disabled={!state.canAfford} class="game-btn game-btn-orange flex-1 py-2.5 px-3 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all duration-150 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:hover:brightness-100 disabled:hover:translate-y-0 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none {!state.canAfford ? 'opacity-50 cursor-not-allowed' : ''}">
      <i class="fa-solid fa-handshake-slash"></i>
      <span>ACQUIRE CITY</span>
      <span class="text-xs font-bold opacity-90">({state.buyoutCostFormatted || '$0'})</span>
    </button>

    <button id="btn-pass-buyout" onclick={onPass} class="game-btn game-btn-slate py-2.5 px-4 text-xs font-black shrink-0 cursor-pointer transition-all duration-150 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none">
      PASS ({state.secondsLeft || 12}s) ✕
    </button>
  </div>
</ActionChipShell>
