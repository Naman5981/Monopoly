<script>
  import { modalStore } from '../stores/modalStore.js';
  import { hudStore } from '../stores/hudStore.js';
  import ActionChipShell from '../components/ActionChipShell.svelte';

  let state = $state({});
  let hud = $state({});
  modalStore.subscribe(val => { state = val.buyout || {}; });
  hudStore.subscribe(val => { hud = val || {}; });

  const isDarkTheme = $derived(hud.lightingMode === 'Night' || hud.boardStyle === 'cyberpunk');

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

<ActionChipShell modalId="modal-buyout-city" cardId="modal-buyout-city-card" visible={state.visible} themeAware={true}>
  <!-- Top Summary Line -->
  <div class="flex items-center justify-between gap-2 border-b pb-2 {isDarkTheme ? 'border-white/10' : 'border-slate-100'}">
    <div class="flex items-center gap-2 truncate min-w-0">
      <span class="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-600 to-rose-800 text-white font-black shadow-sm shrink-0 flex items-center gap-1.5">
        <i class="fa-solid fa-handshake-slash text-xs" aria-hidden="true"></i>
        <span>BUYOUT</span>
      </span>
      <span class="w-3.5 h-3.5 rounded-full shrink-0" style="background-color: {state.colorHex || '#f43f5e'};"></span>
      <h3 id="buyout-modal-name" class="font-display font-black text-sm sm:text-base tracking-wide truncate {isDarkTheme ? 'text-white' : 'text-slate-900'}">
        {state.cityName || state.tile?.name || 'CITY'}
      </h3>
      <span id="buyout-modal-owner" class="text-xs font-black px-2 py-0.5 rounded-full border shrink-0 {isDarkTheme ? 'bg-white/20 text-slate-100 border-white/40' : 'bg-slate-100 text-slate-700 border-slate-200'}">
        From {state.sellerName || 'Opponent'}
      </span>
    </div>
    <div class="flex items-center gap-1.5 text-xs font-black text-right shrink-0">
      <span class="{isDarkTheme ? 'text-slate-400' : 'text-slate-500'}">Cost:</span>
      <span id="buyout-modal-total-cost" class="font-extrabold {isDarkTheme ? 'text-rose-400' : 'text-rose-600'}">{state.buyoutCostFormatted || '$0'}</span>
    </div>
  </div>

  <!-- Takeover Badge & Tax Breakdown -->
  <div class="flex items-center justify-between text-[11px] font-bold px-1 {isDarkTheme ? 'text-slate-300' : 'text-slate-600'}">
    <span class="px-2 py-0.5 rounded-full border {state.isFinalTakeover ? (isDarkTheme ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 font-black' : 'bg-amber-50 text-amber-800 border-amber-200 font-black') : (isDarkTheme ? 'bg-white/10 text-slate-300 border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200')}">
      {state.takeoverBadge || 'TAKEOVER 1/2'}
    </span>
    <span class="{isDarkTheme ? 'text-slate-400' : 'text-slate-500'}">
      Seller gets: <strong class="{isDarkTheme ? 'text-emerald-300' : 'text-emerald-700'}">{state.sellerPayoutFormatted || '$0'}</strong> • Bank Tax: <strong class="{isDarkTheme ? 'text-rose-400' : 'text-rose-600'}">{state.bankFeeFormatted || '$0'}</strong>
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
    <button id="btn-confirm-buyout" onclick={onConfirm} disabled={!state.canAfford} class="flex-1 py-2.5 px-3 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md transition-all duration-150 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none {!state.canAfford ? (isDarkTheme ? 'rounded-full bg-slate-800 border border-white/10 text-slate-400 cursor-not-allowed' : 'rounded-full bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed') : 'game-btn game-btn-orange cursor-pointer hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95'}">
      <i class="fa-solid fa-handshake-slash"></i>
      <span>ACQUIRE CITY</span>
      <span class="text-xs font-bold opacity-90">({state.buyoutCostFormatted || '$0'})</span>
    </button>

    <button id="btn-pass-buyout" onclick={onPass} class="game-btn game-btn-slate py-2.5 px-4 text-xs font-black shrink-0 cursor-pointer transition-all duration-150 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none">
      PASS ({state.secondsLeft || 12}s) ✕
    </button>
  </div>
</ActionChipShell>
