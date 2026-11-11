<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.buyout || {}; });

  function onConfirm() {
    window.confirmBuyoutCity?.();
  }

  function onPass() {
    window.passBuyoutCity?.();
  }
</script>

<div id="modal-buyout-city" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 items-center justify-center p-4 overscroll-contain {state.visible ? 'flex' : 'hidden'}" onclick={(e) => { if (e.target.id === 'modal-buyout-city') onPass(); }}>
  <div id="modal-buyout-city-card" class="game-modal-shell modal-shell-amber max-w-md w-full shadow-2xl">
    <!-- Header -->
    <div id="buyout-modal-header" class="game-modal-header h-36 p-4 flex flex-col justify-between items-center text-center text-white relative shadow-md bg-gradient-to-r from-rose-600 to-rose-800">
      <button onclick={onPass} class="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition z-20" title="Pass Buyout">
        ✕
      </button>

      <span id="buyout-modal-country" class="modal-badge-pill bg-black/30 border border-white/30 text-amber-200">⚔️ HOSTILE BUYOUT</span>
      <canvas id="buyout-city-3d-canvas" width="220" height="110" class="w-[180px] h-[90px] -my-2 relative z-10 pointer-events-none drop-shadow-xl"></canvas>
      <h3 id="buyout-modal-name" class="modal-city-title">{state.tile?.name || 'CITY'}</h3>
    </div>

    <!-- Body -->
    <div class="p-5 space-y-3.5 bg-gradient-to-b from-white to-slate-50/70">
      <div id="buyout-modal-owner" class="text-xs sm:text-sm font-display font-black text-center py-2 px-3 rounded-2xl bg-amber-50 text-amber-950 border-2 border-amber-300 shadow-2xs">
        Acquire from <strong>{state.sellerName || 'Opponent'}</strong>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="game-stat-card stat-card-sky">
          <span class="stat-card-badge">2× BASE PRICE</span>
          <div id="buyout-modal-base-price" class="stat-card-value text-sky-950">{state.basePriceFormatted || '$0'}</div>
        </div>
        <div class="game-stat-card stat-card-emerald">
          <span class="stat-card-badge">HOUSES BUILT</span>
          <div id="buyout-modal-houses-cost" class="stat-card-value text-emerald-950">{state.housesCostFormatted || '$0'}</div>
        </div>
      </div>

      <div class="p-3 bg-gradient-to-r from-rose-500/10 to-rose-600/10 rounded-2xl border-2 border-rose-400 flex items-center justify-between">
        <div>
          <div class="text-[10px] font-black uppercase text-amber-800 tracking-wider">TOTAL BUYOUT COST</div>
          <div id="buyout-modal-total-cost" class="text-xl font-black text-amber-950">{state.buyoutCostFormatted || '$0'}</div>
        </div>
        <div class="text-right">
          <div class="text-[10px] font-black uppercase text-slate-500 tracking-wider">YOUR BALANCE</div>
          <div id="buyout-modal-balance" class="text-sm font-black text-emerald-600">{state.buyerBalanceFormatted || '$0'}</div>
        </div>
      </div>

      <div class="flex gap-3 pt-1">
        <button id="btn-confirm-buyout" onclick={onConfirm} disabled={!state.canAfford} class="game-btn game-btn-orange flex-1 py-3.5 text-sm font-black shadow-lg {!state.canAfford ? 'opacity-50 cursor-not-allowed' : ''}">
          BUYOUT CITY
        </button>
        <button id="btn-pass-buyout" onclick={onPass} class="game-btn game-btn-slate flex-1 py-3.5 text-sm font-black">
          PASS ({state.secondsLeft || 12}s)
        </button>
      </div>
    </div>
  </div>
</div>
