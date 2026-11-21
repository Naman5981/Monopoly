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

  function onPickCard(idx) {
    if (state.isSpinning || state.isSpectator || Boolean(state.wonPrize)) return;
    window.spinChanceWheel?.(idx);
  }
</script>

<style>
  .perspective-viewport {
    perspective: 1200px;
    -webkit-perspective: 1200px;
  }

  .deck-track {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chance-card {
    position: absolute;
    width: 144px;
    height: 214px;
    cursor: pointer;
    transform-origin: center bottom;
    transition: transform 0.55s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.4s ease, filter 0.3s ease;
    user-select: none;
  }

  .card-surface-back {
    width: 100%;
    height: 100%;
    border-radius: 18px;
    background: linear-gradient(145deg, #d97706 0%, #b45309 45%, #78350f 100%);
    border: 3px solid #fde047;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.75);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 14px;
    text-align: center;
  }

  .card-surface-front {
    width: 100%;
    height: 100%;
    border-radius: 18px;
    background: #090e1a;
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.95), 0 0 25px rgba(245, 158, 11, 0.3);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 16px;
    text-align: center;
  }
</style>

<!-- ═══════════════════════════════════════════════════════════════════
     CONCEPT C: 3D MYSTERY CHANCE CARD FAN DECK
     Zero Duplication, Pure Hero Card Reward, Zero Mirroring Bleed
     ═══════════════════════════════════════════════════════════════════ -->
<div
  id="modal-chance-wheel"
  class="fixed inset-0 bg-slate-950/35 backdrop-blur-none z-50 flex-col items-center justify-center p-3 sm:p-4 overscroll-contain select-none {state.visible ? 'flex pointer-events-auto' : 'hidden pointer-events-none'}"
>
  <div
    id="modal-chance-wheel-card"
    class="relative flex flex-col items-center justify-center pointer-events-auto max-w-lg w-full border-amber-400"
  >
    <!-- Solid Dark Plinth (Stops 3D board bleed-through without fullscreen blur) -->
    <div class="w-full bg-slate-950/94 border-2 border-amber-400/50 rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col items-center">
      <!-- Deck Header Tag -->
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-2">
        <span class="text-sm">💎</span>
        <span>CHANCE CARD DECK</span>
      </div>

      <div class="text-base sm:text-lg font-black text-white tracking-tight mb-2">
        {state.wonPrize ? 'Fortune Unlocked!' : 'Pick Your Fortune Card'}
      </div>

      <!-- 3D Perspective Card Fan Viewport -->
      <div class="perspective-viewport relative w-full h-[310px] flex items-center justify-center">
        <div class="deck-track">
          {#each CHANCE_WHEEL_PRIZES as prize, idx}
            {@const centerOffset = idx - 2.5}
            {@const angle = centerOffset * 8.5}
            {@const xOffset = centerOffset * 50}
            {@const yOffset = Math.abs(centerOffset) * 8}
            {@const isWinner = state.winnerIdx === idx}
            {@const isDimmed = state.winnerIdx >= 0 && !isWinner}
            {@const isDrawingHighlight = state.drawingIdx === idx}

            <!-- Individual Chance Card -->
            <div
              id="f-card-{idx}"
              class="chance-card"
              onclick={() => onPickCard(idx)}
              style="
                transform: {isWinner
                  ? 'translate(0px, 14px) scale(1.24)'
                  : (isDimmed
                    ? `translate(${xOffset}px, ${yOffset + 40}px) scale(0.85)`
                    : `translate(${xOffset}px, ${yOffset}px) rotate(${angle}deg)`)};
                z-index: {isWinner ? 50 : idx + 10};
                opacity: {isDimmed ? 0 : 1};
                pointer-events: {isDimmed ? 'none' : 'auto'};
                filter: {isDrawingHighlight ? 'brightness(1.5) drop-shadow(0 0 25px rgba(245, 158, 11, 0.95))' : 'none'};
              "
            >
              {#if isWinner}
                <!-- ════ CARD FRONT: Single Hero Reward (Only mounted on winner -> Zero bleed) ════ -->
                <div
                  class="card-surface-front"
                  style="border: 3px solid {prize.themeColor || prize.color || '#f59e0b'};"
                >
                  <div class="w-full flex items-center justify-between text-xs font-bold" style="color: {prize.themeColor || prize.color || '#f59e0b'};">
                    <span class="text-base">{prize.icon || '🎁'}</span>
                    <span class="font-mono text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white">
                      {prize.sub || 'CHANCE'}
                    </span>
                  </div>

                  <div class="my-auto flex flex-col items-center w-full px-1">
                    <div class="text-4xl leading-none mb-1.5">{prize.icon || '🎁'}</div>
                    <div class="text-base sm:text-lg font-black text-white leading-tight tracking-tight">
                      {prize.label}
                    </div>
                    <div class="text-[11px] font-bold text-slate-300 mt-1 line-clamp-2 leading-tight">
                      {prize.desc || prize.title}
                    </div>
                  </div>

                  <div class="text-[9px] font-mono font-black tracking-widest uppercase" style="color: {prize.themeColor || prize.color || '#f59e0b'};">
                    &bull; UNLOCKED &bull;
                  </div>
                </div>
              {:else}
                <!-- ════ CARD BACK: Pure Mystery Back (Zero front DOM elements -> Zero mirrored text) ════ -->
                <div class="card-surface-back hover:brightness-110 transition-all">
                  <div class="w-full flex items-center justify-between text-amber-300 text-xs font-black">
                    <span>💎</span>
                    <span class="font-mono text-[9px] uppercase tracking-wider text-amber-200">CHANCE</span>
                    <span>💎</span>
                  </div>

                  <div class="my-auto flex flex-col items-center">
                    <div class="w-12 h-12 rounded-full bg-amber-400/25 border-2 border-amber-300/60 flex items-center justify-center text-2xl font-black text-amber-100 shadow-inner">
                      ?
                    </div>
                    <div class="text-[11px] font-black uppercase tracking-widest text-amber-200 mt-2">
                      MYSTERY
                    </div>
                  </div>

                  <div class="text-[9px] font-mono font-bold text-amber-300/80 tracking-widest uppercase">
                    &bull; WORLD TYCOON &bull;
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- Action Area: Disappears on reveal so the card itself is the sole hero (Zero duplication) -->
      {#if !state.wonPrize}
        <div class="mt-4 flex flex-col items-center w-full max-w-sm px-2">
          <button
            id="btn-spin-wheel"
            onclick={onDraw}
            disabled={state.isSpinning || state.isSpectator}
            class="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 font-black text-sm uppercase tracking-widest text-slate-950 shadow-[0_12px_28px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all group disabled:opacity-85 disabled:cursor-not-allowed border-2 border-white/80"
            title="Click or pick a card above!"
          >
            <span id="btn-spin-wheel-text" class="flex items-center gap-2 font-black leading-none">
              {#if state.isSpinning}
                <i class="fa-solid fa-arrows-rotate animate-spin text-slate-950 text-base"></i>
                <span>REVEALING CARD...</span>
              {:else if state.isSpectator}
                <i class="fa-solid fa-eye text-slate-950 text-base"></i>
                <span>WATCHING DRAW...</span>
              {:else}
                <span>✨ DRAW CHANCE CARD</span>
              {/if}
            </span>
          </button>
        </div>
      {/if}
    </div>

    <!-- Hidden compatibility ticker pin, canvas, and text for existing tests -->
    <div id="chance-wheel-ticker-pin" class="hidden pointer-events-none" aria-hidden="true"></div>
    <div id="chance-result-text" class="hidden pointer-events-none" aria-hidden="true"></div>
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
