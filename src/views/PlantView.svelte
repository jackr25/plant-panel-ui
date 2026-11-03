<script lang="ts">
  import Chart from '../lib/components/Chart.svelte';
  import MoistureBar from '../lib/components/MoistureBar.svelte';
  import PlantEditor from '../lib/components/PlantEditor.svelte';
  import PlantPhoto from '../lib/components/PlantPhoto.svelte';
  import StatusBadge from '../lib/components/StatusBadge.svelte';
  import WateringForm from '../lib/components/WateringForm.svelte';
  import { errorText } from '../lib/api';
  import { ago, dateTime, eventText, nowS, pct, until } from '../lib/format';
  import type { PlantEvent, Series } from '../lib/icd';
  import { api, href, live } from '../lib/state.svelte';

  let { key }: { key: string } = $props();

  const RANGES = [
    { label: '24 h', days: 1 },
    { label: '7 d', days: 7 },
    { label: '30 d', days: 30 },
    { label: '90 d', days: 90 },
  ];
  let days = $state(7);
  let series = $state<Series | null>(null);
  let events = $state<PlantEvent[]>([]);
  let error = $state<string | null>(null);
  let to = $state(nowS());
  let editing = $state(false);
  let logging = $state(false);

  const plant = $derived(live.find(key));
  const from = $derived(to - days * 86_400);

  $effect(() => {
    void live.revision;
    const span = days * 86_400;
    const end = nowS();
    // ~300 points whatever the range; raw samples for the shortest one.
    const step = days <= 1 ? 0 : Math.round(span / 300 / 300) * 300;
    const client = api();
    Promise.all([
      client.samples(key, { since: end - span, until: end, step }),
      client.events({ since: end - span, plant: key }),
    ])
      .then(([s, e]) => {
        series = s;
        events = e.reverse();
        to = end;
        error = null;
      })
      .catch((e) => (error = errorText(e)));
  });
</script>

<a class="back" href={href.dashboard}>← Plants</a>

{#if !plant}
  <p class="sub">{live.loading ? 'Loading…' : `No plant "${key}".`}</p>
{:else}
  <header class="page-head">
    <div class="title">
      <PlantPhoto {plant} size={72} />
      <div>
        <h1>{plant.name} <StatusBadge status={plant.status} /></h1>
        <p class="sub">{plant.hostname} · {plant.sensor_id}{plant.rssi != null ? ` · ${plant.rssi} dBm` : ''}</p>
      </div>
    </div>
    {#if !editing && !logging}
      <div class="head-actions">
        <button onclick={() => (logging = true)}>Log watering</button>
        <button onclick={() => (editing = true)}>Edit</button>
      </div>
    {/if}
  </header>

  {#if logging}
    <WateringForm {plant} onclose={() => (logging = false)} />
  {/if}
  {#if editing}
    <PlantEditor {plant} onclose={() => (editing = false)} />
  {:else if plant.notes}
    <section class="panel notes">{plant.notes}</section>
  {/if}

  <div class="hero">
    <div class="now">
      <span class="value">{pct(plant.moisture_pct)}</span>
      <MoistureBar pct={plant.moisture_pct} threshold={plant.dry_threshold_pct} status={plant.status} />
      <span class="sub">dry below {plant.dry_threshold_pct}% · seen {ago(plant.last_seen)}</span>
    </div>
    <div class="next">
      <span class="label">Next watering</span>
      <span class="big">{plant.status === 'water_now' ? 'Now' : until(plant.next_watering)}</span>
      <span class="sub">{plant.next_watering ? dateTime(plant.next_watering) : 'not enough history yet'}</span>
    </div>
  </div>

  <section class="panel">
    <div class="panel-head">
      <h2>Moisture</h2>
      <div class="seg" role="group" aria-label="Time range">
        {#each RANGES as r (r.days)}
          <button class:active={days === r.days} onclick={() => (days = r.days)}>{r.label}</button>
        {/each}
      </div>
    </div>
    {#if error}
      <p class="error">{error}</p>
    {:else if series && series.t.length}
      <Chart
        t={series.t}
        pct={series.pct}
        threshold={plant.dry_threshold_pct}
        {from}
        {to}
        forecast={plant.forecast}
        nextWatering={plant.next_watering}
        {events}
        height={260}
      />
      <p class="legend">
        <span class="k line"></span>measured
        {#if plant.forecast}<span class="k proj"></span>forecast{/if}
        <span class="k thr"></span>dry threshold
        <span class="k water"></span>watering
      </p>
    {:else}
      <p class="sub">No samples in this range.</p>
    {/if}
  </section>

  <div class="cols">
    <section class="panel">
      <h2>Analysis</h2>
      <dl class="stats">
        <dt>Drying rate</dt>
        <dd>{plant.forecast ? `${plant.forecast.rate_pct_per_day.toFixed(1)}%/day` : '—'}</dd>
        <dt>Model</dt>
        <dd>{plant.forecast ? `${plant.forecast.model}, ${Math.round(plant.forecast.confidence * 100)}% confidence` : '—'}</dd>
        <dt>Last 24 h</dt>
        <dd>
          {#if plant.day}{pct(plant.day.min_pct)} – {pct(plant.day.max_pct)} (mean {pct(plant.day.mean_pct)}){:else}—{/if}
        </dd>
        <dt>Last watered</dt>
        <dd>{plant.last_watered ? `${dateTime(plant.last_watered)} (${ago(plant.last_watered)})` : '—'}</dd>
        <dt>Waterings</dt>
        <dd>
          {#if plant.history}
            {plant.history.waterings} in {plant.history.horizon_days} days{plant.history.median_interval_days != null
              ? `, every ~${plant.history.median_interval_days.toFixed(1)} days`
              : ''}
          {:else}—{/if}
        </dd>
        <dt>Fitted</dt>
        <dd>{plant.forecast ? ago(plant.forecast.fitted_at) : '—'}</dd>
      </dl>
    </section>

    <section class="panel">
      <h2>Events</h2>
      {#if events.length}
        <ul class="events">
          {#each events as e (e.t + e.kind)}
            <li>
              <span class="dot {e.kind}"></span>
              <span>{eventText(e)}</span>
              <time class="sub">{dateTime(e.t)}</time>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="sub">None in this range.</p>
      {/if}
    </section>
  </div>
{/if}

<style>
  .back {
    display: inline-block;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
  }
  .title {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 0;
  }
  .head-actions {
    display: flex;
    gap: 0.5rem;
  }
  .notes {
    white-space: pre-line;
    overflow-wrap: anywhere;
  }
  h1 {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .hero {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .now,
  .next {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem 1.2rem;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
  }
  .value {
    font-size: 2.6rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .label {
    color: var(--muted);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .big {
    font-size: 1.6rem;
    font-weight: 700;
  }
  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  .panel-head h2 {
    margin: 0;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 0.9rem;
    margin: 0.5rem 0 0;
    color: var(--muted);
    font-size: 0.8rem;
  }
  .k {
    display: inline-block;
    width: 16px;
    height: 0;
    margin-right: -0.5rem;
    border-top: 2px solid var(--accent);
  }
  .k.proj {
    border-top-style: dashed;
    opacity: 0.7;
  }
  .k.thr {
    border-top: 2px dotted var(--danger);
  }
  .k.water {
    width: 0;
    height: 12px;
    border-top: 0;
    border-left: 2px solid var(--water);
  }
  .cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .stats {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.45rem 1rem;
    margin: 0;
  }
  .stats dt {
    color: var(--muted);
  }
  .stats dd {
    margin: 0;
  }
  .events {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 300px;
    overflow-y: auto;
  }
  .events li {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.6rem;
  }
  @media (max-width: 720px) {
    .hero,
    .cols {
      grid-template-columns: 1fr;
    }
  }
</style>
