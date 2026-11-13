<script>
  import { modalStore } from '../stores/modalStore.js';

  let state = $state({});
  modalStore.subscribe(val => { state = val.wardrobe || {}; });

  const rarityClasses = {
    common: 'bg-slate-100 text-slate-700 border-slate-200',
    rare: 'bg-sky-100 text-sky-800 border-sky-300',
    epic: 'bg-purple-100 text-purple-800 border-purple-300',
    legendary: 'bg-amber-100 text-amber-900 border-amber-300',
    mythic: 'bg-rose-100 text-rose-900 border-rose-300'
  };

  function onClose() {
    window.closeWardrobeModal?.();
  }

  function onCategory(cat) {
    window.setWardrobeCategory?.(cat);
  }

  function onResetProgress() {
    if (confirm('Reset Tycoon Stars and unlocked cosmetics to balanced defaults?')) {
      window.resetTycoonProfile?.();
    }
  }

  function onPreview(event, item) {
    if (event.target.closest('button')) return;
    window.previewWardrobeItem?.(item.category, item.id);
  }

  function onPreviewKeydown(event, item) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.previewWardrobeItem?.(item.category, item.id);
    }
  }

  function onEquip(event, item) {
    event.stopPropagation();
    window.equipWardrobeItem?.(item.category, item.id);
  }

  function onUnlock(event, item) {
    event.stopPropagation();
    window.unlockWardrobeItem?.(item.id);
  }
</script>

<div id="modal-wardrobe" role="dialog" aria-modal="true" aria-labelledby="wardrobe-title" class="fixed inset-0 z-50 items-stretch justify-end {state.visible ? 'flex wardrobe-panel-visible pointer-events-auto' : 'hidden wardrobe-panel-hidden pointer-events-none'}{state.isClosing ? ' wardrobe-panel-hidden !pointer-events-none' : ''}">
  <!-- Clickable backdrop on left side (clean transparent, zero blur on 3D character) -->
  <div id="wardrobe-backdrop" onclick={onClose} class="absolute inset-0 bg-transparent pointer-events-none transition-opacity duration-300 {state.visible ? 'opacity-100 pointer-events-auto' : 'opacity-0'}" title="Click to return to lobby"></div>

  <!-- Slide-in Wardrobe Card Drawer -->
  <div id="wardrobe-panel-card" class="relative z-10 w-full sm:w-[540px] md:w-[620px] lg:w-[680px] xl:w-[740px] h-full bg-slate-900/95 backdrop-blur-xl border-l-2 border-amber-400/40 shadow-2xl flex flex-col pointer-events-auto overflow-hidden">
    <!-- Header Banner -->
    <div class="game-modal-header relative p-5 pb-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white flex items-center justify-between shadow-sm overflow-hidden flex-shrink-0">
      <!-- Floating Watermark Icons -->
      <svg class="ui-watermark -right-3 -top-3 w-28 h-28 text-white/10" aria-hidden="true"><use href="#icon-wardrobe"></use></svg>
      <svg class="ui-watermark -left-3 -bottom-3 w-28 h-28 text-white/10" aria-hidden="true"><use href="#icon-sparkle"></use></svg>

      <div class="relative z-10 flex items-center gap-3">
        <div class="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner border border-white/30 select-none">
          <svg class="ui-icon w-5 h-5 text-white" aria-hidden="true"><use href="#icon-wardrobe"></use></svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 id="wardrobe-title" class="font-rounded font-black text-lg sm:text-xl text-white tracking-wide drop-shadow-sm">
              TYCOON WARDROBE
            </h2>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-amber-100 shadow-xs border border-white/20">
              <svg class="ui-icon w-3 h-3 text-amber-200" aria-hidden="true"><use href="#icon-sparkle"></use></svg> PREVIEW
            </span>
          </div>
          <p class="text-xs font-semibold text-amber-100 mt-0.5">
            Click any item to test live on your 3D character
          </p>
        </div>
      </div>

      <!-- Right: Star Balance Badge & Accessible Close Button -->
      <div class="flex items-center gap-2.5">
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/40 backdrop-blur-md border border-amber-300/40 text-amber-300 font-black text-xs sm:text-sm shadow-inner" title="Your Tycoon Stars balance">
          <svg class="ui-icon w-3.5 h-3.5 text-amber-400" aria-hidden="true"><use href="#icon-star"></use></svg>
          <span id="wardrobe-stars-balance" class="tabular-nums">{state.starsBalance || 500}</span>
        </div>
        <button id="btn-close-wardrobe" onclick={onClose} class="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-[0.96] text-white flex items-center justify-center cursor-pointer transition-[transform,background-color] duration-150 ease-out text-base" title="Close Wardrobe [Esc]" aria-label="Close Wardrobe">
          <svg class="ui-icon w-4 h-4 text-white" aria-hidden="true"><use href="#icon-xmark"></use></svg>
        </button>
      </div>
    </div>

    <!-- Category Filter Tabs -->
    <div class="bg-slate-100/90 border-b border-slate-200 px-5 py-2.5 flex items-center gap-2 select-none overflow-x-auto flex-shrink-0" role="tablist" aria-label="Wardrobe Categories">
      <button onclick={() => onCategory('hat')} data-category="hat" class="wardrobe-tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer {state.activeCategory === 'hat' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} flex items-center gap-1.5 active:scale-[0.96]" role="tab" aria-selected="{state.activeCategory === 'hat'}">
        <svg class="ui-icon w-4 h-4" aria-hidden="true"><use href="#icon-hat"></use></svg> <span>Hats & Headwear</span>
      </button>
      <button onclick={() => onCategory('dice')} data-category="dice" class="wardrobe-tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer {state.activeCategory === 'dice' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} flex items-center gap-1.5 active:scale-[0.96]" role="tab" aria-selected="{state.activeCategory === 'dice'}">
        <svg class="ui-icon w-4 h-4" aria-hidden="true"><use href="#icon-dice"></use></svg> <span>Dice Skins</span>
      </button>
      <button onclick={() => onCategory('pedestal')} data-category="pedestal" class="wardrobe-tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer {state.activeCategory === 'pedestal' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} flex items-center gap-1.5 active:scale-[0.96]" role="tab" aria-selected="{state.activeCategory === 'pedestal'}">
        <svg class="ui-icon w-4 h-4" aria-hidden="true"><use href="#icon-pedestal"></use></svg> <span>Token Pedestals</span>
      </button>
    </div>

    <!-- Item Grid Arena with contain overscroll -->
    <div class="p-5 sm:p-6 overflow-y-auto flex-1 bg-slate-50/70 overscroll-contain">
      <div id="wardrobe-items-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {#each state.items || [] as item (item.id)}
          {@const borderClass = item.isPreviewing
            ? 'border-sky-500 ring-2 ring-sky-400 shadow-md bg-sky-50/50 scale-[1.01]'
            : item.isEquipped
              ? 'border-emerald-400 ring-1 ring-emerald-200 shadow-sm'
              : 'border-slate-200 hover:border-sky-300 shadow-xs'}
          <div
            onclick={(event) => onPreview(event, item)}
            onkeydown={(event) => onPreviewKeydown(event, item)}
            role="button"
            tabindex="0"
            class="relative bg-white border-2 {borderClass} rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-150 ease-out"
            title="Click to preview on avatar"
          >
            <div>
              <div class="flex items-start justify-between gap-2 mb-2">
                <span class="text-3xl select-none filter drop-shadow-xs">{item.icon}</span>
                <div class="flex flex-col items-end gap-1">
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border {rarityClasses[item.rarity] || rarityClasses.common}">{item.rarity}</span>
                  {#if item.isPreviewing}
                    <span class="px-2 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">👁 PREVIEW</span>
                  {/if}
                  {#if item.isEquipped}
                    <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider">✓ ACTIVE</span>
                  {:else if item.isUnlocked}
                    <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">UNLOCKED</span>
                  {:else}
                    <span class="px-2 py-0.5 rounded-full {item.canAfford ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'} text-[10px] font-black tracking-wider">🔒 {item.cost.toLocaleString()} ⭐</span>
                  {/if}
                </div>
              </div>
              <h4 class="font-rounded font-black text-xs sm:text-sm text-slate-900 leading-tight">{item.name}</h4>
              <p class="text-[11px] text-slate-500 font-medium leading-normal mt-1 mb-3">{item.desc}</p>
            </div>
            <div class="mt-auto pt-1">
              {#if item.isEquipped}
                <button disabled class="w-full py-2 px-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-xs">✓ Equipped</button>
              {:else if item.isUnlocked}
                <button onclick={(event) => onEquip(event, item)} class="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-[0.96] text-white font-black text-xs cursor-pointer" aria-label="Equip {item.name}">Equip</button>
              {:else}
                <button onclick={(event) => onUnlock(event, item)} disabled={!item.canAfford} class="w-full py-2 px-3 rounded-xl {item.canAfford ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'} font-black text-xs" aria-label="Unlock {item.name} for {item.cost.toLocaleString()} Tycoon Stars">🔒 {item.cost.toLocaleString()} ⭐</button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Footer Info -->
    <div class="bg-white border-t border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 flex-shrink-0">
      <div class="flex items-center gap-3 text-slate-600 font-semibold text-[11px] sm:text-xs">
        <div class="flex items-center gap-1.5">
          <i class="fa-solid fa-trophy text-amber-500 text-sm"></i>
          <span>Earn <strong>+140 ⭐</strong> on match victory, <strong>+60 ⭐</strong> for completing, plus city & monopoly bonuses!</span>
        </div>
        <button onclick={onResetProgress} class="text-[10px] text-slate-400 hover:text-rose-500 font-bold underline cursor-pointer ml-1" title="Reset to starter wallet">
          Reset Progress
        </button>
      </div>
      <button onclick={onClose} class="game-btn game-btn-blue px-6 py-2 text-xs font-black shadow-xs active:scale-[0.96] transition duration-150 ease-out">
        Done
      </button>
    </div>
  </div>
</div>
