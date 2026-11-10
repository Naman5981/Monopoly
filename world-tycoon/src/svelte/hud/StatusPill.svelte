<script>
  import { hudStore } from '../stores/hudStore.js';

  let state = $state({});
  hudStore.subscribe(val => { state = val; });

  function onStatusPill() { window.handleStatusPillClick?.(); }
  function onRoll() { window.handleRollButtonClick?.(); }
  function onBail() { window.handlePayIslandBail?.(); }

  // Turn timer ring math: circumference is 113
  let timerOffset = $derived(
    113 - ((state.turnTimeLeft || 15) / (state.turnMax || 15)) * 113
  );
</script>

<!-- Turn Lock Notification Toast -->
{#if state.toast?.visible}
  <div id="turn-lock-toast" class="turn-lock-toast flex items-center gap-2">
    <i class="fa-solid fa-lock text-amber-400"></i>
    <span>{state.toast.text || 'Wait for your turn!'}</span>
  </div>
{/if}

<!-- Unified Bottom Action Dock -->
<div id="hud-bottom-status-wrap" class="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2.5 pointer-events-none w-full max-w-xl px-4 transition-[transform,opacity] duration-300">
  <!-- Status Pill -->
  <div onclick={onStatusPill} class="hud-status-pill pointer-events-auto cursor-pointer" title="Click to roll dice or view activity log">
    <div class="hud-status-pill-avatar shrink-0">
      <span class="w-2.5 h-2.5 rounded-full {state.statusPill?.isThinking ? 'animate-ping' : ''}" style="background-color: {state.statusPill?.dotColor || '#10b981'}"></span>
    </div>
    <div class="hud-status-pill-icon text-sm flex items-center justify-center shrink-0">
      {state.statusPill?.icon || '🎲'}
    </div>
    <div id="hud-status-pill-text" class="hud-status-pill-text truncate">
      {@html state.statusPill?.text || 'Welcome to World Tycoon! Roll to start.'}
    </div>
    <div class="hud-status-pill-badge text-[10px] text-slate-300 font-extrabold uppercase tracking-wider hidden sm:flex items-center gap-1 border-l border-white/20 pl-2 shrink-0">
      <i class="fa-solid fa-list-ul text-[9px] text-amber-400"></i> LOG
    </div>
  </div>

  <!-- Roll Station: Bail + Centered Roll + 15s Timer Ring -->
  <div id="hud-roll-station" class="relative flex items-center justify-center pointer-events-auto">
    <!-- Island Pay Bail Button -->
    {#if state.bailButton?.visible}
      <button id="btn-escape-island" onclick={onBail} class="bottom-bail-btn flex max-sm:static max-sm:mr-2 sm:absolute sm:right-full sm:mr-3 items-center gap-1.5 whitespace-nowrap cursor-pointer" title="Pay 150K bail to exit Island immediately">
        <i class="fa-solid fa-lock-open text-sm"></i>
        <span id="bottom-bail-label">{state.bailButton.label || 'Pay 150K Bail'}</span>
      </button>
    {/if}

    <!-- Primary Roll Button -->
    <button id="btn-bottom-roll" onclick={onRoll} class="bottom-roll-btn cursor-pointer {state.rollButton?.enabled ? '' : 'opacity-70'}" title="Roll Dice [Space]">
      <i class="fa-solid fa-dice text-xl"></i>
      <span id="bottom-roll-label">{state.rollButton?.label || 'Roll'}</span>
      <kbd class="text-[10px] bg-black/25 px-2 py-0.5 rounded-full font-mono text-white/90 border border-white/20 hidden sm:inline-block">SPACE</kbd>
    </button>

    <!-- Circular Turn Timer Ring -->
    <div class="absolute left-full ml-3 w-12 h-12 flex items-center justify-center drop-shadow-md">
      <svg class="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" fill="#ffffff" stroke="#e2e8f0" stroke-width="4.5"></circle>
        <circle cx="22" cy="22" r="18" fill="none" stroke="#f59e0b" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="113" stroke-dashoffset={timerOffset}></circle>
      </svg>
      <span class="absolute font-rounded font-extrabold text-base text-slate-800 tabular-nums">
        {state.turnTimeLeft !== undefined ? state.turnTimeLeft : 15}
      </span>
    </div>
  </div>
</div>
