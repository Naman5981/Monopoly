<script>
  import { hudStore } from '../stores/hudStore.js';

  let {
    modalId = '',
    cardId = '',
    visible = false,
    borderColor = 'border-emerald-500/80',
    themeAware = false,
    children
  } = $props();

  let hud = $state({});
  hudStore.subscribe(val => { hud = val || {}; });

  const isDarkTheme = $derived(hud.lightingMode === 'Night' || hud.boardStyle === 'cyberpunk');

  function onBackdropClick(e) {
    if (e.target === e.currentTarget && typeof window.handleModalBackdropClick === 'function') {
      window.handleModalBackdropClick(e, () => {
        // Safe dismiss or close if action has a pass function
        if (typeof window.passBuyCity === 'function' && modalId === 'modal-buy-city') window.passBuyCity();
        else if (typeof window.passBuyoutCity === 'function' && modalId === 'modal-buyout-city') window.passBuyoutCity();
        else if (typeof window.closeUpgradeCityModal === 'function' && modalId === 'modal-upgrade-city') window.closeUpgradeCityModal();
      });
    }
  }
</script>

<div id={modalId} onclick={onBackdropClick} class="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[1000] items-center justify-center p-2 w-full max-w-lg overscroll-contain {visible ? 'flex' : 'hidden'}">
  {#if themeAware}
    <div id={cardId} class="w-full rounded-3xl p-3.5 sm:p-4 shadow-2xl flex flex-col gap-2.5 select-none font-ui pointer-events-auto overscroll-contain {isDarkTheme ? 'bg-slate-900/95 border border-white/15 text-white' : 'bg-white border-2 border-slate-200 text-slate-900'}">
      {@render children?.()}
    </div>
  {:else}
    <div id={cardId} class="w-full !bg-slate-950/95 border-2 {borderColor} rounded-3xl p-3.5 sm:p-4 text-white shadow-2xl flex flex-col gap-2.5 select-none font-ui pointer-events-auto overscroll-contain" style="background-color: rgba(2, 6, 23, 0.96) !important; color: #ffffff !important;">
      {@render children?.()}
    </div>
  {/if}
</div>
