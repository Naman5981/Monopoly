<script>
  let {
    modalId = '',
    cardId = '',
    visible = false,
    borderColor = 'border-emerald-500/80',
    children
  } = $props();

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
  <div id={cardId} class="w-full !bg-slate-950/95 border-2 {borderColor} rounded-3xl p-3.5 sm:p-4 text-white shadow-2xl flex flex-col gap-2.5 select-none font-ui pointer-events-auto overscroll-contain" style="background-color: rgba(2, 6, 23, 0.96) !important; color: #ffffff !important;">
    {@render children?.()}
  </div>
</div>
