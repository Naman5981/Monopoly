<script>
  import { modalStore } from '../stores/modalStore.js';
  import { hudStore } from '../stores/hudStore.js';
  import ActionChipShell from '../components/ActionChipShell.svelte';

  let state = $state({});
  let hud = $state({});
  modalStore.subscribe(val => { state = val.buyCity || {}; });
  hudStore.subscribe(val => { hud = val || {}; });

  const isDarkTheme = $derived(hud.lightingMode === 'Night' || hud.boardStyle === 'cyberpunk');
  const formatCurrency = (val) => {
    const str = String(val || '0');
    return str.startsWith('$') ? str : `$${str}`;
  };

  function onConfirmBuy() {
    window.confirmBuyCity?.();
  }

  function onPassBuy() {
    window.passBuyCity?.();
  }

  function handleWindowKeydown(e) {
    if (!state.visible) return;
    if (e.target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable)) return;
    if (e.key === 'Enter') {
      if (state.canAfford) {
        e.preventDefault();
        onConfirmBuy();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onPassBuy();
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<ActionChipShell modalId="modal-buy-city" cardId="modal-buy-city-card" visible={state.visible} themeAware={true}>
  <!-- Top Summary Line -->
  <div class="flex items-center justify-between gap-2 pb-2.5 border-b {isDarkTheme ? 'border-white/10' : 'border-slate-100'}">
    <div class="flex items-center gap-2.5 truncate min-w-0">
      <span class="w-3 h-3 rounded-full shrink-0" style="background-color: {state.colorHex || '#0284c7'}; box-shadow: 0 0 0 3px {isDarkTheme ? 'rgba(255,255,255,0.12)' : 'rgba(14,165,233,0.16)'};"></span>
      <div class="min-w-0">
        <h3 id="buy-modal-name" class="font-display font-black text-base sm:text-lg leading-tight truncate {isDarkTheme ? 'text-white' : 'text-slate-900'}">
          {state.cityName || 'City'}
        </h3>
        <div id="buy-modal-country" class="text-[11px] font-bold uppercase tracking-wider truncate {isDarkTheme ? 'text-slate-400' : 'text-slate-500'}">
          {state.countryName || 'Estate'}
        </div>
      </div>
    </div>

    <div class="flex items-center rounded-xl px-2.5 sm:px-3 py-1 shrink-0 border {isDarkTheme ? 'bg-emerald-500/15 border-emerald-400/35' : 'bg-emerald-50 border-emerald-200'}">
      <div class="flex flex-col items-end leading-none">
        <span class="text-[10px] font-black uppercase tracking-wider {isDarkTheme ? 'text-emerald-400' : 'text-emerald-700'}">Base Rent</span>
        <span id="buy-modal-rent" class="font-mono font-black text-base sm:text-lg tabular-nums mt-0.5 {isDarkTheme ? 'text-emerald-300' : 'text-emerald-700'}">
          {formatCurrency(state.rentFormatted)}
        </span>
      </div>
    </div>
  </div>

  <!-- Hidden compatibility price element + visible balance preview -->
  <span id="buy-modal-price" class="hidden">{state.priceFormatted || '0'}</span>
  {#if state.balancePreview}
    <div class="flex items-center justify-between text-[11px] font-bold px-1 {isDarkTheme ? 'text-slate-300' : 'text-slate-600'}">
      <span class="uppercase tracking-wider">Balance After</span>
      <span id="buy-modal-balance-preview" class="font-mono font-black tabular-nums {isDarkTheme ? 'text-sky-300' : 'text-sky-700'}">{state.balancePreview}</span>
    </div>
  {:else}
    <span id="buy-modal-balance-preview" class="hidden"></span>
  {/if}

  {#if state.isMonopolyFinisher}
    <div class="px-3 py-1.5 rounded-xl border flex items-center justify-between text-xs {isDarkTheme ? 'bg-amber-500/15 border-amber-400/40 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'}">
      <span class="font-black flex items-center gap-1.5 {isDarkTheme ? 'text-amber-300' : 'text-amber-800'}">
        <i class="fa-solid fa-crown text-amber-500 text-xs" aria-hidden="true"></i>
        <span>Monopoly Finisher</span>
      </span>
      <span class="text-xs font-bold">2× District Rent</span>
    </div>
  {/if}

  <!-- Action Buttons Row -->
  <div class="flex items-center gap-2 pt-0.5">
    <button id="btn-confirm-buy" onclick={onConfirmBuy} disabled={!state.canAfford} class="flex-1 py-2.5 px-4 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md transition-[transform,filter] duration-150 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none {!state.canAfford ? (isDarkTheme ? 'rounded-full bg-slate-800 border border-white/10 text-slate-400 cursor-not-allowed' : 'rounded-full bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed') : 'game-btn game-btn-green cursor-pointer hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-95'}">
      <span>Buy for {formatCurrency(state.priceFormatted)}</span>
    </button>

    <button id="btn-pass-buy" onclick={onPassBuy} class="py-2.5 px-4 text-xs sm:text-sm font-black shrink-0 cursor-pointer transition-[transform,filter] duration-150 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none {isDarkTheme ? 'rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-slate-200' : 'game-btn game-btn-slate'}">
      Pass
    </button>
  </div>
</ActionChipShell>
