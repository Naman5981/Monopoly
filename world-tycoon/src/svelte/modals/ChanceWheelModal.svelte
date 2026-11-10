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

<!-- 2. Chance Wheel Result Card Popup -->
<div id="modal-chance-result" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 items-center justify-center p-4 {state.resultVisible ? 'flex' : 'hidden'}">
  <div class="game-modal-shell modal-shell-purple max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
    <div class="w-16 h-16 mx-auto rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-3xl shadow-inner">
      {state.cardIcon || '🎲'}
    </div>
    <div>
      <h4 id="chance-result-popup-title" class="font-rounded font-black text-xl text-slate-800">
        {state.resultTitle || 'CHANCE CARD'}
      </h4>
      <p id="chance-result-popup-desc" class="text-xs font-bold text-slate-600 mt-2 leading-relaxed">
        {state.resultDesc || ''}
      </p>
    </div>
    <button id="btn-chance-result-ok" onclick={onCloseResult} class="game-btn game-btn-purple w-full py-3 text-sm font-black">
      CONTINUE
    </button>
  </div>
</div>
