<script>
  import { modalStore } from '../stores/modalStore.js';
  import { CHANCE_WHEEL_PRIZES } from '../../game/data.js';
  import { drawChanceWheelCanvas } from '../../ui/modals/chanceCanvas.js';

  let state = $state({});
  let canvasEl = $state(null);
  modalStore.subscribe(val => { state = val.chanceWheel || {}; });

  function renderWheel() {
    try {
      if (canvasEl) drawChanceWheelCanvas(canvasEl);
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
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  });

  function onDraw() {
    window.spinChanceWheel?.();
  }

  function onClose() {
    window.closeChanceWheelModal?.();
  }
</script>

<!-- ═══════════════════════════════════════════════════════════════════
     CONCEPT C: 3D MYSTERY CHANCE CARD FAN DECK
     Zero Box Slop, Authentic Tabletop Monopoly Lore, True 3D Card Flip
     ═══════════════════════════════════════════════════════════════════ -->
<div
  id="modal-chance-wheel"
  class="fixed inset-0 bg-slate-950/30 backdrop-blur-none z-50 flex-col items-center justify-center p-3 sm:p-4 overscroll-contain select-none {state.visible ? 'flex pointer-events-auto' : 'hidden pointer-events-none'}"
>
  <div
    id="modal-chance-wheel-card"
    class="relative flex flex-col items-center justify-center pointer-events-auto max-w-xl w-full border-amber-400"
  >
    <!-- Deck Stage Header Tag -->
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-2 shadow-lg">
      <span class="text-sm">💎</span>
      <span>CHANCE CARD DECK</span>
    </div>

    <!-- 3D Perspective Card Fan Viewport -->
    <div class="relative w-full max-w-lg h-64 sm:h-72 flex items-center justify-center [perspective:1000px] my-2">
      <div class="relative w-full h-full flex items-center justify-center [transform-style:preserve-3d]">
        {#each CHANCE_WHEEL_PRIZES as prize, idx}
          {@const angle = (idx - 2.5) * 10}
          {@const xOffset = (idx - 2.5) * 52}
          {@const isWinner = state.winnerIdx === idx}
          {@const isDrawingHighlight = state.drawingIdx === idx}
          {@const isDimmed = state.winnerIdx >= 0 && !isWinner}

          <!-- Individual 3D Flipper Card -->
          <div
            id="f-card-{idx}"
            class="absolute w-32 h-48 sm:w-36 sm:h-52 cursor-pointer origin-bottom transition-all duration-600 ease-out [transform-style:preserve-3d]"
            style="
              transform: {isWinner
                ? 'translate(0px, -20px) rotate(0deg) rotateY(180deg) scale(1.35)'
                : `translateX(${xOffset}px) rotate(${angle}deg)`};
              z-index: {isWinner ? 50 : idx + 10};
              opacity: {isDimmed ? 0.22 : 1};
              filter: {isDrawingHighlight ? 'brightness(1.55) drop-shadow(0 0 25px rgba(245, 158, 11, 0.95))' : 'none'};
            "
          >
            <!-- ════ CARD BACK: Luxury Gold-Filigree Mystery Crest ════ -->
            <div
              class="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-950 border-2 sm:border-[2.5px] border-amber-300 shadow-[0_15px_35px_rgba(0,0,0,0.85)] flex flex-col items-center justify-between p-3.5 text-center [backface-visibility:hidden]"
            >
              <div class="w-full flex items-center justify-between text-amber-300 text-xs">
                <span>💎</span>
                <span class="font-mono text-[9px] font-black uppercase tracking-wider text-amber-200">CHANCE</span>
                <span>💎</span>
              </div>

              <div class="my-auto flex flex-col items-center">
                <div class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-amber-400/20 border border-amber-300/50 flex items-center justify-center text-xl sm:text-2xl font-black text-amber-100 shadow-inner">
                  ?
                </div>
                <div class="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-amber-200 mt-2">
                  MYSTERY
                </div>
              </div>

              <div class="text-[8px] sm:text-[9px] font-mono text-amber-300/75 tracking-widest uppercase">
                &bull; WORLD TYCOON &bull;
              </div>
            </div>

            <!-- ════ CARD FRONT: Revealed High-Contrast Reward ════ -->
            <div
              class="absolute inset-0 rounded-2xl bg-slate-950 border-2 sm:border-[3px] shadow-[0_20px_45px_rgba(0,0,0,0.95)] flex flex-col items-center justify-between p-3.5 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]"
              style="border-color: {prize.themeColor || prize.color || '#f59e0b'};"
            >
              <div class="w-full flex items-center justify-between text-xs" style="color: {prize.themeColor || prize.color || '#f59e0b'};">
                <span class="text-base">{prize.icon || '🎁'}</span>
                <span class="font-mono text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white">
                  {prize.sub || 'CHANCE'}
                </span>
              </div>

              <div class="my-auto flex flex-col items-center w-full px-1">
                <div class="text-3xl sm:text-4xl leading-none">{prize.icon || '🎁'}</div>
                <div class="text-base sm:text-lg font-black text-white mt-1.5 leading-tight tracking-tight">
                  {prize.label}
                </div>
                <div class="text-[10px] sm:text-[11px] font-bold text-slate-300 mt-1 line-clamp-2 leading-tight">
                  {prize.title || prize.desc}
                </div>
              </div>

              <div class="text-[9px] font-mono font-black tracking-widest uppercase" style="color: {prize.themeColor || prize.color || '#f59e0b'};">
                &bull; UNLOCKED &bull;
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Center Interactive Draw Button -->
    <div class="mt-4 flex flex-col items-center w-full px-4">
      <button
        id="btn-spin-wheel"
        onclick={onDraw}
        disabled={state.isSpinning || state.isSpectator || Boolean(state.wonPrize)}
        class="w-full max-w-sm py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 font-black text-sm uppercase tracking-widest text-slate-950 shadow-[0_12px_28px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all group disabled:opacity-85 disabled:cursor-not-allowed border-2 border-white/80"
        title="Click to draw a Chance card!"
      >
        <span id="btn-spin-wheel-text" class="flex items-center gap-2 font-black leading-none">
          {#if state.isSpinning}
            <i class="fa-solid fa-arrows-rotate animate-spin text-slate-950 text-base"></i>
            <span>REVEALING CARD...</span>
          {:else if state.isSpectator}
            <i class="fa-solid fa-eye text-slate-950 text-base"></i>
            <span>WATCHING DRAW...</span>
          {:else if state.wonPrize}
            <span>{state.wonPrize.icon || '🎉'} CARD UNLOCKED!</span>
          {:else}
            <span>✨ DRAW CHANCE CARD</span>
          {/if}
        </span>
      </button>

      <!-- Outcome Banner or Hint -->
      {#if state.wonPrize}
        <div
          id="chance-wheel-won-banner"
          class="mt-3.5 px-5 py-3 rounded-2xl bg-slate-950/95 border-2 border-amber-400 text-white shadow-[0_16px_36px_rgba(0,0,0,0.95)] flex items-center gap-3.5 max-w-sm sm:max-w-md w-full animate-bounce-short"
        >
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
        <div
          id="chance-result-text"
          class="mt-3 px-4 py-1.5 rounded-full bg-slate-950/85 border border-white/15 text-slate-300 text-xs font-bold tracking-wide shadow-md"
        >
          {state.isSpectator ? 'Spectating player draw...' : (state.isSpinning ? 'Sweeping light across cards...' : 'Click to draw your Chance card!')}
        </div>
      {/if}
    </div>

    <!-- Hidden compatibility ticker pin and canvas for existing tests & canvas calls -->
    <div id="chance-wheel-ticker-pin" class="hidden pointer-events-none" aria-hidden="true"></div>
    <canvas bind:this={canvasEl} id="chance-wheel-canvas" width="640" height="640" class="hidden pointer-events-none" aria-hidden="true"></canvas>
  </div>
</div>

<!-- Compatibility Result Container for Headless Integration Tests -->
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
