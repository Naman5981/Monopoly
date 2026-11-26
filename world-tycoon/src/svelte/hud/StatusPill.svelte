<script>
  import { hudStore } from '../stores/hudStore.js';
  import { modalStore, isAnyModalOpen } from '../stores/modalStore.js';

  let state = $state({});
  let modals = $state({});
  hudStore.subscribe(val => { state = val; });
  modalStore.subscribe(val => { modals = val || {}; });

  const hideStatusPillForDock = $derived(
    Boolean(modals.buyCity?.visible || modals.upgradeCity?.visible || modals.buyoutCity?.visible)
  );

  function onStatusPill() { window.handleStatusPillClick?.(); }
  function onRoll() { window.handleRollButtonClick?.(); }
  function onBail() { window.handlePayIslandBail?.(); }

  // Turn timer ring math: circumference is 113
  let timerOffset = $derived(
    113 - ((state.turnTimeLeft || 15) / (state.turnMax || 15)) * 113
  );

  let formattedText = $derived.by(() => {
    const raw = state.statusPill?.text || 'Welcome to World Tycoon! Roll to start.';
    if (typeof raw !== 'string') return raw;
    return raw
      .replace(/^🎲\s*/, '<i class="fa-solid fa-dice text-amber-400 mr-1.5" aria-hidden="true"></i>')
      .replace(/^⏳\s*/, '<i class="fa-solid fa-hourglass-half text-amber-400 mr-1.5" aria-hidden="true"></i>')
      .replace(/^🤔\s*/, '<i class="fa-solid fa-brain text-amber-400 mr-1.5" aria-hidden="true"></i>');
  });

  function handleWindowKeydown(e) {
    if (e.target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable)) return;
    if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar' || e.keyCode === 32) {
      if (isAnyModalOpen()) return;
      if (state.rollButton?.visible && state.rollButton?.enabled) {
        e.preventDefault();
        onRoll();
      }
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<!-- Turn Lock Notification Toast -->
{#if state.toast?.visible}
  <div id="turn-lock-toast" class="turn-lock-toast flex items-center gap-2">
    <i class="fa-solid fa-lock text-amber-400"></i>
    <span>{state.toast.text || 'Wait for your turn!'}</span>
  </div>
{/if}

<!-- Unified Bottom Action Dock -->
<div id="hud-bottom-status-wrap" class="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 hidden flex flex-col items-center gap-2.5 pointer-events-none w-full max-w-xl px-4 transition-[transform,opacity] duration-300">
  <!-- Status Pill (hidden when a bottom action dock is open so it never peeks behind) -->
  <div id="hud-status-pill" onclick={onStatusPill} class="hud-status-pill pointer-events-auto cursor-pointer transition-all duration-150 hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0 {hideStatusPillForDock ? 'opacity-0 pointer-events-none' : ''}" title="Click to roll dice or view activity log">
    <div class="hud-status-pill-avatar shrink-0">
      <span id="hud-status-pill-dot" class="w-2.5 h-2.5 rounded-full {state.statusPill?.isThinking ? 'animate-ping' : ''}" style="background-color: {state.statusPill?.dotColor || '#10b981'}"></span>
    </div>
    <div id="hud-status-pill-icon" class="hud-status-pill-icon text-sm flex items-center justify-center shrink-0" aria-hidden="true">
      {#if state.statusPill?.icon === '🎲'}
        <i class="fa-solid fa-dice text-amber-400"></i>
      {:else if state.statusPill?.icon === '⏳'}
        <i class="fa-solid fa-hourglass-half text-amber-400"></i>
      {:else if state.statusPill?.icon === '⚡'}
        <i class="fa-solid fa-bolt text-amber-400"></i>
      {:else if state.statusPill?.icon === '🤔'}
        <i class="fa-solid fa-brain text-amber-400"></i>
      {:else}
        <span>{state.statusPill?.icon || ''}</span>
      {/if}
    </div>
    <div id="hud-status-pill-text" class="hud-status-pill-text truncate">
      {@html formattedText}
    </div>
    <div class="hud-status-pill-badge text-xs text-slate-300 font-extrabold uppercase tracking-wider hidden sm:flex items-center gap-1 border-l border-white/20 pl-2 shrink-0">
      <i class="fa-solid fa-list-ul text-[10px] text-amber-400" aria-hidden="true"></i> LOG
    </div>
  </div>

  <!-- Roll Station: Bail + Centered Roll + 15s Timer Ring (only visible when roll station is active) -->
  {#if state.rollButton?.visible}
    <div id="hud-roll-station" class="relative flex items-center justify-center pointer-events-auto">
      <!-- Island Pay Bail Button -->
      {#if state.bailButton?.visible}
        <button id="btn-escape-island" onclick={onBail} class="bottom-bail-btn flex max-sm:static max-sm:mr-2 sm:absolute sm:right-full sm:mr-3 items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all duration-150 ease-out hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96]" title="Pay 150K bail to exit Island immediately">
          <i class="fa-solid fa-lock-open text-sm" aria-hidden="true"></i>
          <span id="bottom-bail-label">{state.bailButton.label || 'Pay 150K Bail'}</span>
        </button>
      {/if}

      <!-- Primary Roll Button -->
      <button id="btn-bottom-roll" onclick={onRoll} class="bottom-roll-btn cursor-pointer transition-all duration-150 ease-out hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] disabled:hover:brightness-100 disabled:hover:translate-y-0 {state.rollButton?.enabled ? '' : 'opacity-70'}" title="Roll Dice [Space]">
        <i class="fa-solid fa-dice text-xl" aria-hidden="true"></i>
        <span id="bottom-roll-label">{state.rollButton?.label || 'Roll'}</span>
        <kbd class="text-xs bg-black/25 px-2 py-0.5 rounded-full font-mono text-white/90 border border-white/20 hidden sm:inline-block">SPACE</kbd>
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
  {/if}
</div>
