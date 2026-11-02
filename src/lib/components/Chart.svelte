<script lang="ts">
  import { project, type Forecast, type PlantEvent } from '../icd';
  import { dateTime } from '../format';

  interface Props {
    t: number[];
    pct: number[];
    threshold: number;
    /** x domain, unix seconds. With a forecast the chart extends 25% past `to`. */
    from: number;
    to: number;
    forecast?: Forecast | null;
    nextWatering?: number | null;
    events?: PlantEvent[];
    height?: number;
    /** Sparkline: no axes, no hover, no projection. */
    compact?: boolean;
  }

  let {
    t,
    pct,
    threshold,
    from,
    to,
    forecast = null,
    nextWatering = null,
    events = [],
    height = 240,
    compact = false,
  }: Props = $props();

  const clipId = $props.id();
  const DAY = 86_400;
  const MARKED = new Set(['watering', 'rapid_drop', 'dry']);

  let width = $state(0);
  let hover = $state<number | null>(null);

  const pad = $derived(compact ? { l: 2, r: 2, t: 4, b: 4 } : { l: 34, r: 14, t: 10, b: 22 });
  const last = $derived(t.length ? { t: t[t.length - 1], pct: pct[pct.length - 1] } : null);
  const showProjection = $derived(!compact && forecast !== null && last !== null);
  const x1 = $derived(showProjection ? to + (to - from) * 0.25 : to);
  const iw = $derived(Math.max(1, width - pad.l - pad.r));
  const ih = $derived(Math.max(1, height - pad.t - pad.b));

  const yDomain = $derived.by((): [number, number] => {
    let lo = threshold;
    let hi = threshold;
    for (const v of pct) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    lo = Math.max(0, Math.floor((lo - 5) / 5) * 5);
    hi = Math.min(100, Math.ceil((hi + 5) / 5) * 5);
    return [lo, Math.max(hi, lo + 10)];
  });

  const sx = (tt: number) => pad.l + ((tt - from) / (x1 - from || 1)) * iw;
  const sy = (v: number) => pad.t + (1 - (v - yDomain[0]) / (yDomain[1] - yDomain[0])) * ih;

  const line = $derived.by(() => {
    if (!t.length) return '';
    const dts: number[] = [];
    for (let i = 1; i < t.length; i++) dts.push(t[i] - t[i - 1]);
    dts.sort((a, b) => a - b);
    const gap = Math.max(900, 4 * (dts[dts.length >> 1] ?? 0)); // break the line over outages
    let d = '';
    for (let i = 0; i < t.length; i++) {
      const cmd = i === 0 || t[i] - t[i - 1] > gap ? 'M' : 'L';
      d += `${cmd}${sx(t[i]).toFixed(1)},${sy(pct[i]).toFixed(1)}`;
    }
    return d;
  });

  const projection = $derived.by(() => {
    if (!showProjection || !forecast || !last) return '';
    let d = '';
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const tt = last.t + ((x1 - last.t) * i) / n;
      const v = project(forecast, last.pct, (tt - last.t) / DAY);
      d += `${i ? 'L' : 'M'}${sx(tt).toFixed(1)},${sy(v).toFixed(1)}`;
    }
    return d;
  });

  const yTicks = $derived.by(() => {
    const [lo, hi] = yDomain;
    const step = hi - lo > 30 ? 10 : 5;
    const out: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
    return out;
  });

  const xTicks = $derived.by(() => {
    if (compact) return [];
    const spanS = x1 - from;
    const hours = spanS <= 1.5 * DAY ? 3 : spanS <= 3 * DAY ? 6 : 0;
    const days = hours ? 0 : spanS <= 16 * DAY ? 1 : spanS <= 60 * DAY ? 7 : 14;
    const fmt: Intl.DateTimeFormatOptions = hours
      ? { hour: '2-digit', minute: '2-digit' }
      : days === 1
        ? { weekday: 'short' }
        : { month: 'short', day: 'numeric' };
    const minGap = 56; // px between labels
    const d = new Date(from * 1000);
    d.setHours(0, 0, 0, 0); // local midnight, so ticks land on round times
    const out: { t: number; label: string }[] = [];
    let lastX = -Infinity;
    while (d.getTime() / 1000 <= x1) {
      const tt = d.getTime() / 1000;
      if (tt >= from && sx(tt) - lastX >= minGap) {
        out.push({ t: tt, label: d.toLocaleString(undefined, fmt) });
        lastX = sx(tt);
      }
      if (hours) d.setHours(d.getHours() + hours);
      else d.setDate(d.getDate() + days);
    }
    return out;
  });

  const markers = $derived(events.filter((e) => MARKED.has(e.kind) && e.t >= from && e.t <= x1));
  const dueVisible = $derived(!compact && nextWatering != null && nextWatering >= from && nextWatering <= x1);

  function onMove(e: PointerEvent) {
    if (compact || !t.length) return;
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const tt = from + ((e.clientX - rect.left - pad.l) / iw) * (x1 - from);
    let lo = 0;
    let hi = t.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (t[mid] < tt) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0 && tt - t[lo - 1] < t[lo] - tt) lo--;
    hover = lo;
  }
</script>

<div class="chart" bind:clientWidth={width} style:height="{height}px">
  {#if width > 0}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <svg
      {width}
      {height}
      role="img"
      aria-label="Soil moisture over time"
      onpointermove={onMove}
      onpointerleave={() => (hover = null)}
    >
      <defs>
        <clipPath id={clipId}><rect x={pad.l} y={pad.t} width={iw} height={ih} /></clipPath>
      </defs>

      {#if !compact}
        {#if x1 > to}
          <rect class="future" x={sx(to)} y={pad.t} width={sx(x1) - sx(to)} height={ih} />
        {/if}
        {#each yTicks as v (v)}
          <line class="grid" x1={pad.l} x2={pad.l + iw} y1={sy(v)} y2={sy(v)} />
          <text class="axis" x={pad.l - 6} y={sy(v)} dy="0.32em" text-anchor="end">{v}</text>
        {/each}
        {#each xTicks as tk (tk.t)}
          <line class="grid faint" x1={sx(tk.t)} x2={sx(tk.t)} y1={pad.t} y2={pad.t + ih} />
          <text class="axis" x={sx(tk.t)} y={height - 6} text-anchor="middle">{tk.label}</text>
        {/each}
      {/if}

      <g clip-path={`url(#${clipId})`}>
        <line class="threshold" x1={pad.l} x2={pad.l + iw} y1={sy(threshold)} y2={sy(threshold)} />
        {#each markers as m (m.t + m.kind)}
          <line class="marker {m.kind}" x1={sx(m.t)} x2={sx(m.t)} y1={pad.t} y2={pad.t + ih} />
        {/each}
        {#if projection}<path class="projection" d={projection} />{/if}
        <path class="line" class:compact d={line} />
        {#if dueVisible && nextWatering != null}
          <circle class="due" cx={sx(nextWatering)} cy={sy(threshold)} r="4.5" />
        {/if}
      </g>

      {#if hover !== null && t[hover] !== undefined}
        {@const hx = sx(t[hover])}
        {@const hy = sy(pct[hover])}
        {@const left = hx > pad.l + iw - 150}
        <line class="cursor" x1={hx} x2={hx} y1={pad.t} y2={pad.t + ih} />
        <circle class="point" cx={hx} cy={hy} r="3.5" />
        <g transform="translate({left ? hx - 146 : hx + 8},{pad.t + 4})">
          <rect class="tip" width="138" height="36" rx="6" />
          <text class="tip-value" x="8" y="15">{pct[hover].toFixed(1)}%</text>
          <text class="tip-time" x="8" y="29">{dateTime(t[hover])}</text>
        </g>
      {/if}
    </svg>
  {/if}
</div>

<style>
  .chart {
    width: 100%;
    position: relative;
    touch-action: pan-y;
  }
  svg {
    display: block;
    overflow: visible;
  }
  .grid {
    stroke: var(--grid);
    stroke-width: 1;
  }
  .grid.faint {
    opacity: 0.5;
  }
  .axis {
    fill: var(--muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }
  .future {
    fill: var(--surface-2);
  }
  .line {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .line.compact {
    stroke-width: 1.75;
  }
  .projection {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.75;
    stroke-dasharray: 5 5;
    opacity: 0.7;
  }
  .threshold {
    stroke: var(--danger);
    stroke-width: 1.25;
    stroke-dasharray: 3 4;
    opacity: 0.8;
  }
  .marker {
    stroke-width: 1.5;
    opacity: 0.55;
  }
  .marker.watering {
    stroke: var(--water);
  }
  .marker.rapid_drop {
    stroke: var(--warn);
  }
  .marker.dry {
    stroke: var(--danger);
  }
  .due {
    fill: var(--surface);
    stroke: var(--danger);
    stroke-width: 2;
  }
  .cursor {
    stroke: var(--muted);
    stroke-width: 1;
    opacity: 0.5;
  }
  .point {
    fill: var(--accent);
    stroke: var(--surface);
    stroke-width: 2;
  }
  .tip {
    fill: var(--surface);
    stroke: var(--border);
  }
  .tip-value {
    fill: var(--text);
    font-size: 13px;
    font-weight: 600;
  }
  .tip-time {
    fill: var(--muted);
    font-size: 11px;
  }
</style>
