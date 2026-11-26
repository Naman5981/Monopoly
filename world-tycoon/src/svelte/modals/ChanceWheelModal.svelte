<script>
  import { modalStore } from '../stores/modalStore.js';
  import { CHANCE_WHEEL_PRIZES, BOARD_EDITIONS } from '../../game/data.js';
  import { matchSettings } from '../../game/state.js';
  import { drawChanceWheelCanvas } from '../../ui/modals/chanceCanvas.js';

  let state = $state({});
  let canvasEl = $state(null);
  modalStore.subscribe(val => { state = val.chanceWheel || {}; });

  const activePrizes = $derived(
    (matchSettings?.boardEdition && BOARD_EDITIONS[matchSettings.boardEdition]?.chancePrizes)
      ? BOARD_EDITIONS[matchSettings.boardEdition].chancePrizes
      : CHANCE_WHEEL_PRIZES
  );

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
    width: 138px;
    height: 208px;
    cursor: pointer;
    transform-origin: center bottom;
    transition: transform 0.55s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.4s ease, filter 0.3s ease;
    user-select: none;
  }

  /* ═══════════════════════════════════════════════════════════════════
     TILE-MATCHED GOLDEN TAROT ARCHWAY (DIRECT MATCH FROM BOARD TILE)
     Deep Midnight Slate + Double Gilded Arch + Constellation Stars + Glowing ?
     ═══════════════════════════════════════════════════════════════════ */
  .card-surface-back, .card-tarot-back {
    width: 100%;
    height: 100%;
    border-radius: 16px;
    background: #090d16;
    border: 3.5px solid #f59e0b;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.88), inset 0 0 25px rgba(245, 158, 11, 0.08);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 10px;
    text-align: center;
    position: relative;
  }

  .card-surface-back .inner-arch, .card-tarot-back .inner-arch {
    position: absolute;
    inset: 6px;
    border-radius: 11px;
    border: 1.5px solid #fde047;
    pointer-events: none;
  }

  .card-surface-back .star-dot, .card-tarot-back .star-dot {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #fef08a;
    box-shadow: 0 0 6px #fde047;
  }

  .card-surface-front, .card-tarot-front {
    width: 100%;
    height: 100%;
    border-radius: 18px;
    background: #090d16;
    box-shadow: 0 22px 50px rgba(0, 0, 0, 0.95);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 16px 14px;
    text-align: center;
    position: relative;
  }

  .card-surface-front .inner-arch, .card-tarot-front .inner-arch {
    position: absolute;
    inset: 6px;
    border-radius: 13px;
    pointer-events: none;
  }

  .card-surface-front .star-dot, .card-tarot-front .star-dot {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
  }

  /* Radiant Gold Aura behind cards */
  .radiant-aura {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -55%);
    width: 460px;
    height: 320px;
    pointer-events: none;
    transition: background 0.5s ease;
  }
</style>

<!-- ═══════════════════════════════════════════════════════════════════
     CHANCE MODAL: AUTHENTIC TILE-MATCHED TAROT DECK
     Atmospheric Cinematic Vignette, Zero Wireframe Box Slop, Zero Bleed
     ═══════════════════════════════════════════════════════════════════ -->
<div
  id="modal-chance-wheel"
  class="fixed inset-0 z-50 flex flex-col items-center justify-center p-3 sm:p-4 overscroll-contain select-none backdrop-blur-none {state.visible ? 'flex pointer-events-auto' : 'hidden pointer-events-none'}"
  style="background: radial-gradient(circle at 50% 48%, rgba(9, 13, 22, 0.92) 0%, rgba(4, 7, 13, 0.96) 75%, rgba(2, 4, 8, 0.98) 100%) !important;"
>
  <div
    id="modal-chance-wheel-card"
    class="relative flex flex-col items-center justify-center pointer-events-auto max-w-xl w-full border-amber-400"
  >
    <!-- Radiant Atmospheric Aura Behind Fan (Direct match from drawChanceTile) -->
    <div
      class="radiant-aura"
      style="background: {state.wonPrize
        ? `radial-gradient(ellipse at center, ${state.wonPrize.themeColor || '#10b981'}44 0%, transparent 72%)`
        : 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.1) 48%, transparent 72%)'};"
    ></div>

    <!-- Header Tag -->
    <div
      class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 shadow-lg transition-all"
      style="
        background: {state.wonPrize ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'};
        border: 1px solid {state.wonPrize ? 'rgba(16, 185, 129, 0.45)' : 'rgba(245, 158, 11, 0.45)'};
        color: {state.wonPrize ? '#6ee7b7' : '#fde047'};
      "
    >
      <span class="text-sm">{matchSettings?.boardEdition === 'rajasthan' ? '👑' : '💎'}</span>
      <span>{state.wonPrize ? (matchSettings?.boardEdition === 'rajasthan' ? 'ROYAL DECREE REVEALED' : 'FORTUNE UNLOCKED') : (matchSettings?.boardEdition === 'rajasthan' ? 'ROYAL CHANCE DECK' : 'CHANCE CARD DECK')}</span>
    </div>

    <!-- Title -->
    <div class="text-lg sm:text-xl font-black text-white tracking-tight mb-2 drop-shadow-md">
      {state.wonPrize
        ? (state.isSpectator ? `${state.playerName || 'Player'}'s Fortune Card` : (matchSettings?.boardEdition === 'rajasthan' ? 'Your Royal Decree' : 'Your Fortune Card'))
        : (state.isSpectator ? `${state.playerName || 'Player'} is picking a card...` : (matchSettings?.boardEdition === 'rajasthan' ? 'Draw Your Royal Decree' : 'Pick Your Fortune Card'))}
    </div>

    <!-- 3D Perspective Card Fan Viewport -->
    <div class="perspective-viewport relative w-full h-[300px] flex items-center justify-center">
      <div class="deck-track">
        {#each activePrizes as prize, idx}
          {@const centerOffset = idx - ((activePrizes.length - 1) / 2)}
          {@const angle = centerOffset * 8.5}
          {@const xOffset = centerOffset * 48}
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
                ? 'translate(0px, 12px) scale(1.22)'
                : (isDimmed
                  ? `translate(${xOffset}px, ${yOffset + 40}px) scale(0.85)`
                  : `translate(${xOffset}px, ${yOffset}px) rotate(${angle}deg)`)};
              z-index: {isWinner ? 50 : idx + 10};
              opacity: {isDimmed ? 0 : 1};
              pointer-events: {isDimmed ? 'none' : 'auto'};
              filter: {isDrawingHighlight ? 'brightness(1.55) drop-shadow(0 0 25px rgba(245, 158, 11, 0.95))' : 'none'};
            "
          >
            {#if isWinner}
              <!-- ════ CARD FRONT: Tile-Matched Revealed Hero Reward ════ -->
              <div
                class="card-surface-front card-tarot-front"
                style="
                  border: 3.5px solid {prize.themeColor || prize.color || '#f59e0b'};
                  box-shadow: 0 22px 50px rgba(0,0,0,0.95), 0 0 35px {prize.themeColor || prize.color || '#f59e0b'}55;
                "
              >
                <!-- Inner Gilded Arch -->
                <div
                  class="inner-arch"
                  style="border: 1.5px solid {prize.themeColor || prize.color || '#f59e0b'}88;"
                ></div>

                <!-- Star Dots -->
                <div class="star-dot" style="top: 14px; left: 14px; background: {prize.themeColor || '#fde047'};"></div>
                <div class="star-dot" style="top: 14px; right: 14px; background: {prize.themeColor || '#fde047'};"></div>
                <div class="star-dot" style="bottom: 14px; left: 14px; background: {prize.themeColor || '#fde047'};"></div>
                <div class="star-dot" style="bottom: 14px; right: 14px; background: {prize.themeColor || '#fde047'};"></div>

                <!-- Top Header -->
                <div class="w-full flex items-center justify-between text-xs font-bold relative z-10" style="color: {prize.themeColor || prize.color || '#f59e0b'};">
                  <span class="text-base">{prize.icon || '🎁'}</span>
                  <span class="font-mono text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-white">
                    {prize.sub || 'CHANCE'}
                  </span>
                </div>

                <!-- Center Reward -->
                <div class="my-auto flex flex-col items-center w-full px-1 relative z-10">
                  <div class="text-4xl leading-none mb-1.5">{prize.icon || '🎁'}</div>
                  <div class="text-base sm:text-lg font-black text-white leading-tight tracking-tight">
                    {prize.label}
                  </div>
                  <div class="text-[11px] font-bold text-slate-300 mt-1 line-clamp-2 leading-tight">
                    {prize.desc || prize.title}
                  </div>
                </div>

                <!-- Footer -->
                <div class="text-[10px] font-mono font-black tracking-widest uppercase relative z-10" style="color: {prize.themeColor || prize.color || '#f59e0b'};">
                  &bull; UNLOCKED &bull;
                </div>
              </div>
            {:else}
              <!-- ════ CARD BACK: Tile-Matched Golden Tarot Archway (Zero Front Elements -> Zero Mirroring Bleed) ════ -->
              <div class="card-surface-back card-tarot-back hover:brightness-110 transition-all">
                <!-- Inner Arch -->
                <div class="inner-arch"></div>

                <!-- Star Dots -->
                <div class="star-dot" style="top: 12px; left: 12px;"></div>
                <div class="star-dot" style="top: 12px; right: 12px;"></div>
                <div class="star-dot" style="bottom: 12px; left: 12px;"></div>
                <div class="star-dot" style="bottom: 12px; right: 12px;"></div>

                <!-- Header -->
                <div class="font-mono text-[10px] font-black text-amber-200 tracking-widest uppercase z-10">
                  {matchSettings?.boardEdition === 'rajasthan' ? 'ROYAL DECREE' : 'FORTUNE'}
                </div>

                <!-- Golden 3D Question Mark Crest -->
                <div class="my-auto flex flex-col items-center z-10">
                  <div class="text-4xl sm:text-5xl font-black text-amber-300 drop-shadow-[0_0_12px_rgba(245,158,11,0.85)] leading-none">
                    {matchSettings?.boardEdition === 'rajasthan' ? '👑' : '?'}
                  </div>
                </div>

                <!-- Footer -->
                <div class="font-mono text-[10px] font-black text-amber-300/80 tracking-widest uppercase z-10">
                  {matchSettings?.boardEdition === 'rajasthan' ? '• PALACE •' : '• DECK •'}
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
              <span>WATCHING {state.playerName ? state.playerName.toUpperCase() : 'DRAW'}...</span>
            {:else}
              <span>{matchSettings?.boardEdition === 'rajasthan' ? '👑 DRAW ROYAL DECREE' : '✨ DRAW CHANCE CARD'}</span>
            {/if}
          </span>
        </button>
      </div>
    {/if}

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
