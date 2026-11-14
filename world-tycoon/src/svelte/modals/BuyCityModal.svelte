<script>
  import { modalStore } from '../stores/modalStore.js';
  import ActionChipShell from '../components/ActionChipShell.svelte';

  let state = $state({});
  modalStore.subscribe(val => { state = val.buyCity || {}; });

  function onConfirmBuy() {
    window.confirmBuyCity?.();
  }

  function onPassBuy() {
    window.passBuyCity?.();
  }
</script>

<ActionChipShell modalId="modal-buy-city" cardId="modal-buy-city-card" visible={state.visible} borderColor="border-sky-500/80">
  <!-- Top Summary Line -->
  <div class="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
    <div class="flex items-center gap-2 truncate">
      <span class="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0" style="background-color: {state.colorHex || '#0284c7'};"></span>
      <h3 id="buy-modal-name" class="font-display font-black text-sm sm:text-base tracking-wide text-white truncate">
        {state.cityName || 'CITY'}
      </h3>
      <span id="buy-modal-country" class="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/20 shrink-0">
        {state.countryName || 'ESTATE'}
      </span>
    </div>
    <div class="flex items-center gap-2 bg-emerald-950/80 border border-emerald-400/60 rounded-xl px-2.5 sm:px-3 py-1 shadow-inner shrink-0">
      <div class="flex flex-col items-end leading-none">
        <span class="text-[9px] font-black uppercase tracking-wider text-emerald-400">Rent</span>
        <span id="buy-modal-rent" class="text-emerald-300 font-black text-base sm:text-lg tabular-nums drop-shadow-[0_0_8px_rgba(52,211,153,0.4)] mt-0.5">
          {state.rentFormatted || '0'}
        </span>
      </div>
    </div>
  </div>

  <!-- Hidden compatibility elements -->
  <span id="buy-modal-price" class="hidden">{state.priceFormatted || '0'}</span>
  <span id="buy-modal-balance-preview" class="hidden">{state.balancePreview || ''}</span>

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
    <button id="btn-confirm-buy" onclick={onConfirmBuy} disabled={!state.canAfford} class="game-btn game-btn-green flex-1 py-2.5 px-3 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md {!state.canAfford ? 'opacity-50 cursor-not-allowed' : ''}">
      <i class="fa-solid fa-cart-shopping"></i>
      <span>BUY PROPERTY</span>
      <span class="text-xs font-bold opacity-90">({state.priceFormatted || '0'})</span>
    </button>

    <button id="btn-pass-buy" onclick={onPassBuy} class="game-btn game-btn-slate py-2.5 px-4 text-xs font-black shrink-0">
      PASS ✕
    </button>
  </div>
</ActionChipShell>
