<script>
  /**
   * svelte/hud/EmotePopover.svelte
   * Declarative Svelte 5 chat reaction & emote drawer for multiplayer / local matches.
   */
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';

  let isOpen = $state(false);

  export function toggle() {
    isOpen = !isOpen;
  }

  export function close() {
    isOpen = false;
  }

  function handleReaction(type) {
    if (typeof window !== 'undefined' && typeof window.triggerReaction === 'function') {
      window.triggerReaction(type);
    }
    isOpen = false;
  }

  function handleQuickEmote(text) {
    if (typeof window !== 'undefined' && typeof window.sendQuickEmote === 'function') {
      window.sendQuickEmote(text);
    }
    isOpen = false;
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      const prevToggle = window.toggleEmotePopover;
      window.toggleEmotePopover = () => {
        isOpen = !isOpen;
        if (typeof prevToggle === 'function') {
          try { prevToggle(); } catch (_) {}
        }
      };
    }
  });
</script>

<div class="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center select-none">
  {#if isOpen}
    <div
      id="emote-popover"
      class="flex mr-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-2 flex-col gap-1.5"
      transition:fly={{ duration: 200, x: 20 }}
    >
      <button
        onclick={() => handleReaction('tomato')}
        class="px-3 py-1.5 rounded-xl hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-2 whitespace-nowrap cursor-pointer transition active:scale-95"
      >
        <span>🍅</span> Throw Tomato
      </button>
      <button
        onclick={() => handleReaction('money')}
        class="px-3 py-1.5 rounded-xl hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-2 whitespace-nowrap cursor-pointer transition active:scale-95"
      >
        <span>💸</span> Money Shower
      </button>
      <button
        onclick={() => handleReaction('fire')}
        class="px-3 py-1.5 rounded-xl hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-2 whitespace-nowrap cursor-pointer transition active:scale-95"
      >
        <span>🔥</span> On Fire!
      </button>
      <button
        onclick={() => handleReaction('sunglasses')}
        class="px-3 py-1.5 rounded-xl hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-2 whitespace-nowrap cursor-pointer transition active:scale-95"
      >
        <span>😎</span> Too Easy!
      </button>
      <button
        onclick={() => handleQuickEmote('🤝 Want to Trade?')}
        class="px-3 py-1.5 rounded-xl hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-2 whitespace-nowrap cursor-pointer transition active:scale-95"
      >
        <span>🤝</span> Deal?
      </button>
      <button
        onclick={() => handleReaction('cry')}
        class="px-3 py-1.5 rounded-xl hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-2 whitespace-nowrap cursor-pointer transition active:scale-95"
      >
        <span>😭</span> Unlucky!
      </button>
    </div>
  {/if}

  <button
    id="btn-toggle-emote-popover"
    onclick={() => { isOpen = !isOpen; }}
    class="w-12 h-12 bg-slate-800/90 hover:bg-slate-900 text-white rounded-l-2xl shadow-lg flex items-center justify-center cursor-pointer transition hover:scale-105 active:scale-95"
    title="Toggle Reactions & Emotes"
    aria-label="Toggle Reactions & Emotes"
  >
    <i class="fa-regular fa-comment-dots text-base"></i>
  </button>
</div>
