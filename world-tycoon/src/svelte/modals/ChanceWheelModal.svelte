<script>
  import { modalStore } from '../stores/modalStore.js';
  import { drawChanceWheelCanvas } from '../../ui/modals/chanceCanvas.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.chanceWheel || {}; });

  $effect(() => {
    if (state.visible) {
      requestAnimationFrame(() => {
        try {
          drawChanceWheelCanvas();
        } catch (err) {
          console.warn('[ChanceWheelModal] Canvas render:', err);
        }
      });
    }
  });

  function onSpin() {
    window.spinChanceWheel?.();
  }

  function onClose() {
    window.closeChanceWheelModal?.();
  }
</script>

<!-- 1. Chance Wheel Interactive Spinner Modal -->
<div id="modal-chance-wheel" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 items-center justify-center p-4 overscroll-contain {state.visible ? 'flex' : 'hidden'}">
  <div id="modal-chance-wheel-card" class="game-modal-shell modal-shell-purple max-w-md w-full relative overflow-hidden shadow-2xl">
    <!-- Wheel Header -->
    <div class="game-modal-header bg-gradient-to-r from-purple-700 via-indigo-600 to-amber-500 p-4 sm:p-5 text-white text-center relative overflow-hidden shadow-md">
      <div class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/25 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-purple-200 border border-white/20 shadow-xs mb-1">
        GLOBAL FORTUNE
      </div>
      <h3 class="font-rounded font-black text-2xl sm:text-3xl tracking-wide drop-shadow-md">
        CHANCE WHEEL
      </h3>
      <p class="text-xs font-bold text-purple-100 drop-shadow mt-0.5">
        Spin the wheel of destiny for fortunes or penalties!
      </p>
    </div>

    <!-- Wheel Canvas Area -->
    <div class="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-indigo-950/90 relative">
      <div class="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
        <!-- SVG Ticker Pointer Needle at top center pointing down -->
        <div id="chance-wheel-ticker-pin" class="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-8 h-8 filter drop-shadow-lg pointer-events-none transform origin-top transition-transform">
          <svg viewBox="0 0 24 24" class="w-full h-full text-amber-400 fill-current">
            <path d="M12 22 L3 4 Q12 7 21 4 Z" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" />
          </svg>
        </div>

        <!-- Canvas where dynamic wheel wedges are drawn (640x640 Retina internal res) -->
        <canvas id="chance-wheel-canvas" width="640" height="640" class="w-full h-full rounded-full shadow-2xl border-4 border-amber-400/80 bg-slate-900"></canvas>
      </div>

      <!-- Action Button -->
      <div class="w-full mt-6">
        <button id="btn-spin-wheel" onclick={onSpin} disabled={state.isSpinning || state.isSpectator} class="game-btn game-btn-purple w-full py-3.5 text-base font-black shadow-xl flex items-center justify-center gap-2 group {state.isSpinning || state.isSpectator ? 'opacity-60 cursor-not-allowed' : ''}">
          <i class="fa-solid fa-arrows-rotate text-lg group-hover:rotate-180 transition-transform duration-500"></i>
          <span id="btn-spin-wheel-text">{state.isSpectator ? 'SPECTATING SPIN...' : (state.isSpinning ? 'SPINNING...' : 'SPIN THE WHEEL!')}</span>
        </button>
      </div>
    </div>
  </div>
</div>

<!-- 2. Chance Wheel Result Card Toast (Punchy Option A Arcade Pill) -->
<div id="modal-chance-result" class="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-[1100] items-center justify-center p-2 w-full max-w-sm pointer-events-none {state.resultVisible ? 'flex' : 'hidden'}">
  <div class="pointer-events-auto w-full px-4 py-3 text-center rounded-2xl border-2 border-amber-400/80 bg-slate-950/95 backdrop-blur-xl text-white shadow-2xl flex flex-col gap-1.5 relative overflow-hidden select-none font-ui">
    <!-- Watermark Icon -->
    <svg class="ui-watermark absolute -right-2 -top-2 w-16 h-16 text-white/5 pointer-events-none" aria-hidden="true"><use href="#icon-sparkle"></use></svg>

    <!-- 1. Player Context Header -->
    <div id="chance-result-player-row" class="relative z-10 flex items-center justify-center gap-2 text-xs">
      <span id="chance-result-player-dot" class="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" style="background-color: {state.result?.playerColor || '#f59e0b'};"></span>
      <span id="chance-result-player-name" class="font-black text-slate-100 truncate">{state.result?.playerName || 'PLAYER'}</span>
      <span class="text-slate-600 font-bold">•</span>
      <span id="chance-result-player-badge" class="text-[10px] font-black uppercase tracking-wider text-amber-300">
        {state.result?.badgeText || 'CHANCE'}
      </span>
    </div>

    <!-- 2. Hero Reward Row (Instant Visual Recognition) -->
    <div class="relative z-10 flex items-center justify-center gap-2.5 my-0.5">
      <div id="chance-result-icon" class="w-10 h-10 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-amber-400/40 bg-amber-500/20 text-amber-300 shrink-0 {state.result?.iconBg || ''}">
        <span>{state.result?.icon || '🎁'}</span>
      </div>
      <div class="text-left min-w-0">
        <h3 id="chance-result-title" class="font-display font-black text-lg sm:text-xl text-white leading-tight tracking-wide tabular-nums drop-shadow">
          {state.result?.title || 'CHANCE REWARD'}
        </h3>
        <p id="chance-result-desc" class="text-xs font-bold text-slate-300 truncate mt-0.5">
          {state.result?.flavorText || state.result?.desc || ''}
        </p>
      </div>
    </div>

    <!-- Hidden compatibility elements for tests & controllers -->
    <span id="chance-result-tag" class="hidden">{state.result?.tag || ''}</span>
    <div id="chance-result-action" class="hidden">
      <span id="chance-result-action-text">{state.result?.actionText || ''}</span>
    </div>

    <!-- 3. Slim 2.2s Timer Bar -->
    <div class="relative z-10 w-full bg-white/10 h-1 rounded-full overflow-hidden mt-0.5">
      <div id="chance-result-timer-bar" class="h-full bg-emerald-400 w-full transition-[width] duration-[2200ms] ease-linear"></div>
    </div>
  </div>
</div>
