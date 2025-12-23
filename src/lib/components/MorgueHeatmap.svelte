<script lang="ts">
  import type { KillCountsByDate } from '$lib/morgue';

  // Props
  let {
    countsByDate = {},
    days = 365
  }: {
    countsByDate: KillCountsByDate;
    days?: number;
  } = $props();

  // Tooltip state
  let hovered = $state<{ iso: string; count: number; x: number; y: number } | null>(null);

  // Date formatters
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  });

  const monthFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short'
  });

  // Helper: get today's ISO date
  function isoToday(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Helper: Date to ISO string
  function toISO(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Helper: get start of week (Monday)
  function startOfWeek(d: Date): Date {
    const copy = new Date(d);
    const dow = copy.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const delta = dow === 0 ? 6 : dow - 1; // Monday = 0 offset
    copy.setDate(copy.getDate() - delta);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  // Get heat class based on kill count
  function heatClass(count: number): string {
    if (count <= 0) return 'bg-neutral-900';
    if (count <= 2) return 'bg-yellow-900';
    if (count <= 5) return 'bg-yellow-600';
    // 6+ kills: bright gold with glow
    return 'bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.65)] ring-1 ring-yellow-300/40';
  }

  // Generate tooltip label
  function label(iso: string, count: number): string {
    const d = new Date(`${iso}T12:00:00`); // noon to avoid timezone issues
    const dateLabel = dateFormatter.format(d);
    const noun = count === 1 ? 'Target' : 'Targets';
    return count > 0
      ? `${dateLabel}: ${count} ${noun} Eliminated`
      : `${dateLabel}: No kills`;
  }

  // Pointer event handlers
  function onEnter(e: PointerEvent, iso: string, count: number): void {
    const t = e.currentTarget as HTMLElement;
    const r = t.getBoundingClientRect();
    hovered = { iso, count, x: r.left + r.width / 2, y: r.top - 8 };
  }

  function onLeave(): void {
    hovered = null;
  }

  // Cell type
  type Cell = { iso: string; count: number; isFuture: boolean };

  // Compute grid data
  const today = $derived(isoToday());

  const cells = $derived.by(() => {
    const todayDate = new Date(`${today}T12:00:00`);
    const startDate = new Date(todayDate);
    startDate.setDate(startDate.getDate() - (days - 1));

    // Align to start of week
    const gridStart = startOfWeek(startDate);

    const out: Cell[] = [];
    const cursor = new Date(gridStart);

    // Generate cells from grid start to today
    while (toISO(cursor) <= today) {
      const iso = toISO(cursor);
      const isFuture = iso > today;
      out.push({
        iso,
        count: countsByDate[iso] ?? 0,
        isFuture
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return out;
  });

  // Group cells into week columns (7 rows each)
  const weeks = $derived.by(() => {
    const cols: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      const week = cells.slice(i, i + 7);
      // Pad incomplete weeks
      while (week.length < 7) {
        week.push({ iso: '', count: 0, isFuture: true });
      }
      cols.push(week);
    }
    return cols;
  });

  // Generate month labels for the header
  const monthLabels = $derived.by(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIndex) => {
      const firstCell = week.find((c) => c.iso && !c.isFuture);
      if (firstCell) {
        const d = new Date(`${firstCell.iso}T12:00:00`);
        const month = d.getMonth();
        if (month !== lastMonth) {
          labels.push({
            label: monthFormatter.format(d),
            weekIndex
          });
          lastMonth = month;
        }
      }
    });

    return labels;
  });

  // Day labels (Mon, Wed, Fri)
  const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''];
</script>

<div class="relative select-none">
  <!-- Month labels -->
  <div class="flex mb-1 text-[10px] text-kl-gold/50 tracking-wider" style="padding-left: 28px;">
    {#each weeks as _, weekIndex}
      {@const monthLabel = monthLabels.find((m) => m.weekIndex === weekIndex)}
      <div class="w-3 flex-shrink-0 mr-1">
        {#if monthLabel}
          <span class="whitespace-nowrap">{monthLabel.label}</span>
        {/if}
      </div>
    {/each}
  </div>

  <div class="flex">
    <!-- Day labels (left side) -->
    <div class="flex flex-col gap-1 mr-1 text-[10px] text-kl-gold/50 tracking-wider">
      {#each dayLabels as dayLabel}
        <div class="h-3 flex items-center justify-end pr-1" style="width: 24px;">
          {dayLabel}
        </div>
      {/each}
    </div>

    <!-- Heatmap grid -->
    <div class="flex gap-1 overflow-x-auto custom-scrollbar pb-2">
      {#each weeks as week, weekIndex (weekIndex)}
        <div class="flex flex-col gap-1 flex-shrink-0">
          {#each week as cell, dayIndex (cell.iso || `${weekIndex}-${dayIndex}`)}
            {#if cell.iso}
              <button
                type="button"
                class="h-3 w-3 rounded-[2px] transition-all duration-150 outline-none
                  focus:ring-2 focus:ring-yellow-400/40 hover:scale-110 active:scale-95
                  {heatClass(cell.count)}
                  {cell.isFuture ? 'opacity-30 pointer-events-none' : 'opacity-100'}"
                aria-label={label(cell.iso, cell.count)}
                onpointerenter={(e) => onEnter(e, cell.iso, cell.count)}
                onpointerleave={onLeave}
              ></button>
            {:else}
              <div class="h-3 w-3"></div>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
  </div>

  <!-- Tooltip -->
  {#if hovered}
    <div
      class="fixed z-50 -translate-x-1/2 -translate-y-full pointer-events-none"
      style="left: {hovered.x}px; top: {hovered.y}px;"
    >
      <div
        class="bg-kl-black border border-kl-gold/30 text-kl-gold text-[11px] px-3 py-1.5 rounded whitespace-nowrap"
        style="font-family: 'JetBrains Mono', monospace;"
      >
        {label(hovered.iso, hovered.count)}
      </div>
    </div>
  {/if}

  <!-- Legend -->
  <div class="flex items-center gap-2 mt-4 text-[10px] text-kl-gold/50">
    <span>Less</span>
    <div class="flex gap-1">
      <div class="h-3 w-3 rounded-[2px] bg-neutral-900"></div>
      <div class="h-3 w-3 rounded-[2px] bg-yellow-900"></div>
      <div class="h-3 w-3 rounded-[2px] bg-yellow-600"></div>
      <div class="h-3 w-3 rounded-[2px] bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.65)]"></div>
    </div>
    <span>More</span>
  </div>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    height: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(212, 175, 55, 0.3);
    border-radius: 2px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(212, 175, 55, 0.5);
  }
</style>

