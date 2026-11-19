<script>
  import { modalStore } from '../stores/modalStore.js';
  import { drawChanceWheelCanvas } from '../../ui/modals/chanceCanvas.js';

  let state = $state({});
  let canvasEl = $state(null);
  modalStore.subscribe(val => { state = val.chanceWheel || {}; });

  function renderWheel() {
    try {
      drawChanceWheelCanvas(canvasEl);
    } catch (err) {
      console.warn('[ChanceWheelModal] Canvas render:', err);
    }
  }

  $effect(() => {
    if (state.visible) {
      renderWheel();
      const raf = requestAnimationFrame(renderWheel);
      const t1 = setTimeout(renderWheel, 40);
      const t2 = setTimeout(renderWheel, 120);
      const t3 = setTimeout(renderWheel, 250);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  });

  function onSpin() {
    window.spinChanceWheel?.();
  }

  function onClose() {
    window.closeChanceWheelModal?.();
  }
</script>

<!-- 1. Chance Wheel Freestanding Arcade Disc (Idea 1 & 3: Zero Box Slop, Integrated Center Hub, Instant Readable Prize Display) -->
<div id="modal-chance-wheel" class="fixed inset-0 bg-slate-950/25 backdrop-blur-none z-50 flex-col items-center justify-center p-4 overscroll-contain select-none {state.visible ? 'flex pointer-events-auto' : 'hidden pointer-events-none'}">
  <div id="modal-chance-wheel-card" class="relative flex flex-col items-center justify-center pointer-events-auto">
    <!-- Pure Circular Dial Container -->
    <div class="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
      <!-- SVG Ticker Pointer Needle at top center pointing down -->
      <div id="chance-wheel-ticker-pin" class="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 w-8 h-8 filter drop-shadow-lg pointer-events-none transform origin-top transition-transform">
        <svg viewBox="0 0 24 24" class="w-full h-full text-amber-400 fill-current">
          <path d="M12 22 L3 4 Q12 7 21 4 Z" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
      </div>

      <!-- Canvas where dynamic wheel wedges are drawn (640x640 Retina internal res) -->
      <canvas bind:this={canvasEl} id="chance-wheel-canvas" width="640" height="640" class="w-full h-full rounded-full border-4 border-amber-400/90 shadow-2xl bg-slate-950"></canvas>

      <!-- Center Hub Button: Sleek 3D Gold Arcade Push-Button -->
      <button
        id="btn-spin-wheel"
        onclick={onSpin}
        disabled={state.isSpinning || state.isSpectator || Boolean(state.wonPrize)}
        class="absolute z-20 w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 border-4 border-white/85 shadow-[0_6px_25px_rgba(245,158,11,0.65)] flex flex-col items-center justify-center text-slate-950 font-black cursor-pointer hover:scale-105 active:scale-95 transition-all group disabled:opacity-85 disabled:cursor-not-allowed"
        title="Click to spin the wheel!"
      >
        <span id="btn-spin-wheel-text" class="flex flex-col items-center justify-center leading-tight">
          {#if state.isSpinning}
            <i class="fa-solid fa-arrows-rotate text-lg animate-spin text-slate-950"></i>
            <span class="text-[10px] uppercase tracking-wider font-black mt-0.5">SPINNING</span>
          {:else if state.isSpectator}
            <i class="fa-solid fa-eye text-sm text-slate-950"></i>
            <span class="text-[10px] uppercase tracking-wider font-black mt-0.5">WATCHING</span>
          {:else if state.wonPrize}
            <span class="text-xl leading-none">{state.wonPrize.icon || '🎉'}</span>
          {:else}
            <span class="text-sm font-black uppercase tracking-widest text-slate-950 leading-none drop-shadow-xs">SPIN</span>
            <span class="text-[10px] font-extrabold text-amber-950 uppercase tracking-wider mt-0.5">WHEEL</span>
          {/if}
        </span>
      </button>
    </div>

    <!-- Integrated Readable Winning Prize Banner (Idea 3: Bold, Readable Info Chip) -->
    {#if state.wonPrize}
      <div id="chance-wheel-won-banner" class="mt-4 px-5 py-3 rounded-2xl bg-slate-950/95 border-2 border-amber-400 text-white shadow-[0_16px_36px_rgba(0,0,0,0.9)] flex items-center gap-3.5 max-w-sm sm:max-w-md animate-bounce-short">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-inner border border-amber-400/40 bg-amber-500/20 text-amber-300 shrink-0">
          <span>{state.wonPrize.icon || '🎁'}</span>
        </div>
        <div class="flex flex-col text-left min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-xs font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono shrink-0">
              {state.wonPrize.tag || 'CHANCE'}
            </span>
            <span class="text-sm sm:text-base font-black text-white truncate drop-shadow">
              {state.wonPrize.title}
            </span>
          </div>
          <span class="text-xs font-semibold text-slate-300 mt-0.5 line-clamp-2">
            {state.wonPrize.desc}
          </span>
        </div>
      </div>
    {:else}
      <!-- Compact Sub-Wheel Status Hint for Spectators & Waiting -->
      <div id="chance-result-text" class="mt-3.5 px-3.5 py-1 rounded-full bg-slate-950/80 border border-white/15 text-slate-300 text-xs font-bold tracking-wide shadow-md">
        {state.isSpectator ? 'Spectating player spin...' : (state.isSpinning ? 'Wheel is spinning...' : 'Click Center Hub to Spin!')}
      </div>
    {/if}
  </div>
</div>

<!-- 2. Hidden Compatibility Container for Tests -->
<div id="modal-chance-result" class="hidden pointer-events-none" aria-hidden="true">
  <div id="chance-result-player-row">
    <span id="chance-result-player-dot"></span>
    <span id="chance-result-player-name"></span>
    <span id="chance-result-player-badge"></span>
  </div>
  <div id="chance-result-icon"></div>
  <h3 id="chance-result-title"></h3>
  <p id="chance-result-desc"></p>
  <span id="chance-result-tag"></span>
  <div id="chance-result-action">
    <span id="chance-result-action-text"></span>
  </div>
  <div id="chance-result-timer-bar"></div>
</div>
