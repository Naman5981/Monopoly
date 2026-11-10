<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.sellCities || {}; });

  function onAutoSell() {
    window.autoSellCheapestForRent?.();
  }

  function onSell(id) {
    window.sellPropertyForRent?.(id);
  }
</script>

<div id="modal-sell-cities" class="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 items-center justify-center p-4 overscroll-contain {state.visible ? 'flex' : 'hidden'}">
  <div id="modal-sell-cities-card" class="game-modal-shell modal-shell-rose max-w-xl w-full flex flex-col max-h-[90vh]">
    <!-- Header -->
    <div class="game-modal-header bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 p-4 text-white relative shadow-md shrink-0">
      <svg class="ui-watermark absolute -right-2 -top-2 w-20 h-20 text-white opacity-15" aria-hidden="true"><use href="#icon-coins"></use></svg>
      <div class="relative z-10 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner border border-white/30">
            <i class="fa-solid fa-hand-holding-dollar text-white drop-shadow"></i>
          </div>
          <div>
            <h3 class="font-display font-black text-lg drop-shadow">LIQUIDATE PROPERTIES</h3>
            <p id="sell-cities-creditor-subtitle" class="text-xs font-extrabold text-rose-100">{state.creditorSubtitle || 'Insufficient cash to pay rent'}</p>
          </div>
        </div>
        <span class="modal-badge-pill bg-black/40 text-rose-200 border-rose-300/40">RENT EMERGENCY</span>
      </div>
    </div>

    <!-- Financial Status Summary Bar -->
    <div class="p-4 bg-gradient-to-b from-white to-slate-50 border-b border-slate-100 shrink-0 space-y-2.5">
      <div class="grid grid-cols-3 gap-2">
        <div class="game-stat-card stat-card-rose p-2.5 text-center">
          <span class="text-[10px] font-black uppercase text-rose-800 tracking-wider">RENT DUE</span>
          <div id="sell-cities-rent-due" class="text-base sm:text-lg font-black text-rose-950">{state.rentDueFormatted || '$0'}</div>
        </div>
        <div class="game-stat-card stat-card-sky p-2.5 text-center">
          <span class="text-[10px] font-black uppercase text-sky-800 tracking-wider">YOUR CASH</span>
          <div id="sell-cities-current-cash" class="text-base sm:text-lg font-black text-sky-950">{state.currentCashFormatted || '$0'}</div>
        </div>
        <div class="game-stat-card stat-card-amber p-2.5 text-center">
          <span class="text-[10px] font-black uppercase text-amber-800 tracking-wider">DEFICIT</span>
          <div id="sell-cities-deficit" class="text-base sm:text-lg font-black text-amber-950">{state.deficitFormatted || '$0'}</div>
        </div>
      </div>

      <!-- Quick Action: Auto-sell cheapest -->
      <button id="btn-auto-sell-cheapest" onclick={onAutoSell} class="game-btn game-btn-orange w-full py-2.5 px-3 text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md">
        <i class="fa-solid fa-bolt-lightning text-amber-300"></i>
        <span>AUTO-SELL CHEAPEST TO COVER RENT</span>
      </button>
    </div>

    <!-- Scrollable Properties Grid -->
    <div class="p-4 overflow-y-auto flex-1 space-y-2.5 bg-slate-50/60" id="sell-cities-card-grid">
      {#if state.ownedProperties && state.ownedProperties.length > 0}
        {#each state.ownedProperties as prop}
          <div onclick={() => onSell(prop.id)}
               onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSell(prop.id); } }}
               tabindex="0"
               role="button"
               data-tile-id="{prop.id}"
               aria-label="Sell {prop.name} for {prop.saleValFormatted}"
               class="group bg-white border-2 border-slate-200/90 hover:border-rose-500 hover:bg-rose-50/20 active:scale-[0.99] rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs hover:shadow-sm transition cursor-pointer select-none">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0" style="background:{prop.color}"></span>
              <div class="truncate">
                <div class="font-black text-xs sm:text-sm text-slate-900 group-hover:text-rose-950 transition-colors truncate">{prop.name}</div>
                <div class="text-[10px] font-bold text-slate-500">{prop.levelDesc}</div>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <div class="text-right">
                <div class="text-[9px] font-extrabold uppercase text-slate-400">SALE VALUE</div>
                <div class="text-xs sm:text-sm font-black text-emerald-600">+{prop.saleValFormatted}</div>
              </div>
              <button type="button"
                      onclick={(e) => { e.stopPropagation(); onSell(prop.id); }}
                      class="game-btn game-btn-rose !py-2 !px-3 text-xs font-black shadow-xs pointer-events-auto">
                <i class="fa-solid fa-tag mr-1"></i> SELL
              </button>
            </div>
          </div>
        {/each}
      {:else}
        <div class="text-center py-8 text-slate-500 font-bold text-xs">
          <i class="fa-solid fa-triangle-exclamation text-amber-500 text-lg mb-1 block"></i>
          No properties left to sell.
        </div>
      {/if}
    </div>
  </div>
</div>
