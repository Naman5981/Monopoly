<script>
  let { chart = null, spotlightIdx = null } = $props();

  let svgEl = $state(null);
  let scrubIdx = $state(null);

  let scrubTurn = $derived(
    chart && !chart.empty && scrubIdx !== null && chart.turns?.[scrubIdx]
      ? chart.turns[scrubIdx]
      : null
  );

  let tooltipRows = $derived.by(() => {
    if (!chart || chart.empty || scrubIdx === null) return [];
    return chart.series
      .map(s => {
        const pt = s.points?.[scrubIdx];
        return {
          name: s.name,
          color: s.color,
          val: pt ? pt.val : 0,
          formatted: pt ? pt.formatted : '$0'
        };
      })
      .sort((a, b) => b.val - a.val);
  });

  function handlePointerScrub(clientX) {
    if (!svgEl || !chart || chart.empty || !chart.turns?.length) return;
    const rect = svgEl.getBoundingClientRect();
    if (!rect.width) return;
    const svgX = ((clientX - rect.left) / rect.width) * chart.width;
    const clampedX = Math.max(chart.padLeft, Math.min(chart.right, svgX));
    const fraction = chart.plotW > 0 ? (clampedX - chart.padLeft) / chart.plotW : 0;
    scrubIdx = Math.max(0, Math.min(chart.turns.length - 1, Math.round(fraction * (chart.turns.length - 1))));
  }

  function onMouseMove(e) {
    handlePointerScrub(e.clientX);
  }

  function onTouchMove(e) {
    if (e.touches && e.touches[0]) {
      handlePointerScrub(e.touches[0].clientX);
    }
  }

  function clearScrub() {
    scrubIdx = null;
  }

  function onChartKeyDown(e) {
    if (!chart || chart.empty || !chart.turns?.length) return;
    const maxIdx = chart.turns.length - 1;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrubIdx = scrubIdx === null ? maxIdx : Math.max(0, scrubIdx - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrubIdx = scrubIdx === null ? 0 : Math.min(maxIdx, scrubIdx + 1);
    } else if (e.key === 'Escape') {
      scrubIdx = null;
    }
  }
</script>

{#if !chart || chart.empty}
  <div class="text-xs text-slate-400 font-bold text-center py-4">No match timeline data recorded</div>
{:else}
  <div class="w-full flex flex-col items-center relative select-none">
    <!-- Floating Scrubber Tooltip -->
    {#if scrubTurn}
      <div class="absolute top-1 right-1 bg-slate-950/95 border border-amber-400/50 rounded-lg px-2 py-1 text-[10px] font-mono pointer-events-none z-20 shadow-lg">
        <div class="text-amber-300 font-bold border-b border-white/10 pb-0.5 mb-0.5">
          {scrubIdx === 0 ? 'Match Start' : scrubTurn.isLive ? 'Current (Live)' : `Round ${scrubTurn.turn}`}
        </div>
        <div class="space-y-0.5">
          {#each tooltipRows as row, rIdx (row.name)}
            <div class="flex items-center justify-between gap-2.5">
              <span class="flex items-center gap-1 font-bold truncate max-w-[85px]" style="color:{row.color}">
                <span>#{rIdx + 1}</span>
                <span class="truncate">{row.name}</span>
              </span>
              <span class="font-bold text-white">{row.formatted}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <svg
      bind:this={svgEl}
      viewBox="0 0 {chart.width} {chart.height}"
      class="w-full h-auto max-h-44 overflow-visible cursor-crosshair focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded"
      role="img"
      tabindex="0"
      aria-label="Net worth trajectory by turn. Use left and right arrow keys to inspect turn values."
      onmousemove={onMouseMove}
      ontouchmove={onTouchMove}
      onmouseleave={clearScrub}
      ontouchend={clearScrub}
      onblur={clearScrub}
      onkeydown={onChartKeyDown}
    >
      <defs>
        {#each chart.series as s (s.playerIdx)}
          <linearGradient id="nw-area-grad-{s.playerIdx}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color={s.color} stop-opacity="0.32" />
            <stop offset="100%" stop-color={s.color} stop-opacity="0" />
          </linearGradient>
        {/each}
      </defs>

      <!-- Horizontal Y-Axis Gridlines -->
      {#each chart.gridLines as line (line.y)}
        <line x1={chart.padLeft} y1={line.y} x2={chart.right} y2={line.y} stroke="#334155" stroke-width="1" stroke-dasharray="3,3" />
        <text x={chart.padLeft - 6} y={line.labelY} text-anchor="end" font-size="8" font-weight="700" fill="#94a3b8" class="font-mono">{line.value}</text>
      {/each}

      <!-- X-Axis Turn Milestones -->
      {#each chart.xTicks as tick (tick.label)}
        <text x={tick.x} y={chart.height - 6} text-anchor="middle" font-size="8" font-weight="700" fill="#64748b" class="font-mono">{tick.label}</text>
      {/each}

      <!-- Soft Area Glow (Spotlighted or Local Player) -->
      {#each chart.series as s (s.playerIdx)}
        {@const isSpotlighted = spotlightIdx === s.playerIdx}
        {@const isDimmed = spotlightIdx !== null && spotlightIdx !== s.playerIdx}
        {#if (isSpotlighted || (spotlightIdx === null && s.isLocal)) && !s.bankrupt}
          <path
            d={s.areaPath}
            fill="url(#nw-area-grad-{s.playerIdx})"
            opacity={isDimmed ? 0.05 : 0.65}
            class="transition-opacity duration-200 pointer-events-none"
          />
        {/if}
      {/each}

      <!-- Trajectory Curves -->
      {#each chart.series as s (s.playerIdx)}
        {@const isSpotlighted = spotlightIdx === s.playerIdx}
        {@const isDimmed = spotlightIdx !== null && spotlightIdx !== s.playerIdx}
        {@const strokeW = isSpotlighted ? 3.5 : (s.isLocal ? 2.5 : 2)}
        {@const op = isDimmed ? 0.2 : s.opacity}
        <path
          d={s.path}
          fill="none"
          stroke={s.color}
          stroke-width={strokeW}
          stroke-dasharray={s.dashArray !== 'none' ? s.dashArray : undefined}
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity={op}
          class="transition-all duration-200"
        />

        <!-- Accessible Shape Markers (Start & End) -->
        {#each [[s.firstX, s.firstY, 2.3], [s.lastX, s.lastY, isSpotlighted ? 4.2 : 3.2]] as [mx, my, sz]}
          {#if s.shape === 'diamond'}
            <polygon
              points="{mx},{Number(my) - sz * 1.3} {Number(mx) + sz * 1.3},{my} {mx},{Number(my) + sz * 1.3} {Number(mx) - sz * 1.3},{my}"
              fill={s.color}
              stroke="#020617"
              stroke-width="1.4"
              opacity={op}
            />
          {:else if s.shape === 'square'}
            <rect
              x={Number(mx) - sz}
              y={Number(my) - sz}
              width={sz * 2}
              height={sz * 2}
              rx="1"
              fill={s.color}
              stroke="#020617"
              stroke-width="1.4"
              opacity={op}
            />
          {:else if s.shape === 'triangle'}
            <polygon
              points="{mx},{Number(my) - sz * 1.3} {Number(mx) + sz * 1.3},{Number(my) + sz * 1.1} {Number(mx) - sz * 1.3},{Number(my) + sz * 1.1}"
              fill={s.color}
              stroke="#020617"
              stroke-width="1.4"
              opacity={op}
            />
          {:else}
            <circle cx={mx} cy={my} r={sz} fill={s.color} stroke="#020617" stroke-width="1.4" opacity={op} />
          {/if}
        {/each}

        {#if s.isLocal && !s.bankrupt && !isDimmed}
          <circle cx={s.lastX} cy={s.lastY} r="6.2" fill="none" stroke={s.color} stroke-width="1.2" opacity="0.7" class="animate-pulse pointer-events-none" />
        {/if}
      {/each}

      <!-- Scrubber Crosshair Line & Snap Dots -->
      {#if scrubTurn}
        <line x1={scrubTurn.x} y1={chart.padTop - 4} x2={scrubTurn.x} y2={chart.bottomY + 2} stroke="#fbbf24" stroke-width="1.4" stroke-dasharray="2,2" class="pointer-events-none" />
        {#each chart.series as s (s.playerIdx)}
          {@const pt = s.points?.[scrubIdx]}
          {#if pt}
            <circle cx={scrubTurn.x} cy={pt.y} r="3.8" fill={s.color} stroke="#ffffff" stroke-width="1.5" class="pointer-events-none" />
          {/if}
        {/each}
      {/if}
    </svg>

    <!-- Static Non-Hoverable Legend -->
    <div class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1 px-1 border-t border-white/10 pt-1.5 w-full pointer-events-none">
      {#each chart.series as s (s.playerIdx)}
        {@const isDimmed = spotlightIdx !== null && spotlightIdx !== s.playerIdx}
        <div class="flex items-center gap-1.5 text-[10px] font-bold transition-opacity duration-150 {isDimmed ? 'opacity-40 text-slate-500' : 'text-slate-300'}">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:{s.color}"></span>
          <span class="truncate max-w-[65px] uppercase">{s.name}</span>
          <span class="text-slate-400 font-semibold font-mono">{s.lastValue}</span>
        </div>
      {/each}
    </div>

    <!-- Screen-Reader Data Fallback -->
    <table class="sr-only">
      <caption>Player Net Worth Summary</caption>
      <thead><tr><th>Player</th><th>Current Net Worth</th></tr></thead>
      <tbody>
        {#each chart.series as s (s.playerIdx)}
          <tr><td>{s.name}</td><td>{s.lastValue}</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
