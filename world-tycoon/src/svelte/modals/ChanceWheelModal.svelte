<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.chanceWheel || {}; });

  function onSpin() {
    window.spinChanceWheel?.();
  }

  function onCloseResult() {
    window.closeChanceResultModal?.();
  }
</script>

<!-- 1. Chance Wheel Spin Modal -->
<div id="modal-chance-wheel" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 items-center justify-center p-4 overscroll-contain {state.visible ? 'flex' : 'hidden'}">
  <div id="modal-chance-wheel-card" class="game-modal-shell modal-shell-purple max-w-md w-full relative overflow-hidden shadow-2xl">
    <!-- Header -->
    <div class="game-modal-header p-4 flex flex-col items-center justify-center text-center text-white relative shadow-md" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #c026d3 100%);">
      <div class="modal-badge-pill relative z-10">
        GLOBAL FORTUNE
      </div>
      <h3 class="modal-city-title text-2xl leading-none mt-2 drop-shadow-lg relative z-10">CHANCE WHEEL</h3>
      <p class="text-xs font-bold text-white/90 drop-shadow mt-1 relative z-10">Spin to unlock empire grants, travel, or surprises</p>
    </div>

    <!-- Body -->
    <div class="p-5 space-y-4 bg-gradient-to-b from-slate-50 via-white to-indigo-50/50">
      <div class="relative w-[310px] h-[310px] mx-auto flex items-center justify-center p-2 rounded-full bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200 border-3 border-white shadow-[inset_0_4px_10px_rgba(0,0,0,0.12),0_8px_20px_rgba(15,23,42,0.15)]">
        <!-- 3D Golden Pointer / Ticker Pin (Dynamic needle vibrating against pegs) -->
        <div id="chance-wheel-ticker-pin" class="chance-wheel-ticker-pin">
          <div class="ticker-pin-head">
            <div class="ticker-pin-gem"></div>
          </div>
          <div class="ticker-pin-needle"></div>
        </div>
        <canvas id="chance-wheel-canvas" width="640" height="640" class="w-[290px] h-[290px] rounded-full drop-shadow-xl select-none"></canvas>
      </div>

      <div id="chance-result-box" class="game-stat-card stat-card-sky py-2.5 px-3 min-h-[48px] text-center">
        <span id="chance-result-text" class="text-xs sm:text-sm font-black text-sky-950">
          {state.cardText || 'Click Spin to test your luck!'}
        </span>
      </div>

      <button id="btn-spin-wheel" onclick={onSpin} disabled={state.isSpinning || state.isSpectator} class="game-btn game-btn-green w-full py-4 text-base font-black tracking-wide shadow-xl {(state.isSpinning || state.isSpectator) ? 'opacity-50 cursor-not-allowed' : ''}">
        {state.isSpectator ? 'WAITING FOR PLAYER...' : state.isSpinning ? 'SPINNING...' : 'SPIN WHEEL'}
      </button>
    </div>
  </div>
</div>

<!-- 2. Chance Wheel Result Card Popup (Tactile Victory-Inspired 2.2s Popup) -->
<div id="modal-chance-result" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 items-center justify-center p-4 {state.resultVisible ? 'flex' : 'hidden'}">
  <div class="game-modal-shell modal-shell-amber max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
    <!-- Watermark Icons -->
    <svg class="ui-watermark absolute -right-3 -top-3 w-24 h-24 text-white opacity-15" aria-hidden="true"><use href="#icon-dice"></use></svg>
    <svg class="ui-watermark absolute -left-3 -bottom-3 w-24 h-24 text-white opacity-15" aria-hidden="true"><use href="#icon-sparkle"></use></svg>

    <!-- Player Context Strip -->
    <div id="chance-result-player-row" class="relative z-10 flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/90 shadow-2xs max-w-[260px] mx-auto">
      <span id="chance-result-player-dot" class="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0 bg-sky-500"></span>
      <span id="chance-result-player-name" class="text-xs font-black text-slate-800 truncate">PLAYER 1</span>
      <span id="chance-result-player-badge" class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">CHANCE CARD</span>
    </div>

    <!-- Icon Badge -->
    <div id="chance-result-icon" class="relative z-10 w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl shadow-md border-2 border-amber-200 bg-amber-50 text-amber-600">
      <svg class="ui-icon w-10 h-10" aria-hidden="true"><use href="#icon-money"></use></svg>
    </div>

    <div class="relative z-10 space-y-1">
      <div id="chance-result-tag" class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-950 font-black text-xs uppercase tracking-wider border border-amber-300 shadow-2xs">
        <svg class="ui-icon w-3 h-3 text-amber-700" aria-hidden="true"><use href="#icon-sparkle"></use></svg> CHANCE REWARD
      </div>
      <h3 id="chance-result-title" class="font-display font-black text-2xl text-slate-900 leading-tight">
        +400,000 GRANT!
      </h3>
    </div>

    <p id="chance-result-desc" class="relative z-10 text-sm font-bold text-slate-600 leading-relaxed max-w-xs mx-auto">
      World Bank Development Grant! Collect 400K!
    </p>

    <div id="chance-result-action" class="relative z-10 py-2.5 px-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 text-slate-800 shadow-2xs">
      <i class="fa-solid fa-bolt text-amber-500"></i>
      <span id="chance-result-action-text">Applying rewards to your empire...</span>
    </div>

    <!-- 2.2s Timer Bar -->
    <div class="relative z-10 w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200 shadow-inner">
      <div id="chance-result-timer-bar" class="h-full bg-emerald-500 w-full transition-[width] duration-[2200ms] ease-linear"></div>
    </div>
  </div>
</div>
