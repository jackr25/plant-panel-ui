<script lang="ts">
  import type { PlantSummary, Series } from '../icd';
  import { api, href, live } from '../state.svelte';
  import { ago, nowS, pct, until } from '../format';
  import Chart from './Chart.svelte';
  import MoistureBar from './MoistureBar.svelte';
  import PlantPhoto from './PlantPhoto.svelte';
  import StatusBadge from './StatusBadge.svelte';

  let { plant }: { plant: PlantSummary } = $props();

  const SPARK_S = 86_400;
  let spark = $state<Series | null>(null);
  let sparkTo = $state(nowS());

  // Last 24 h in 15-minute buckets (≤ 96 points); refetched after each live refresh.
  $effect(() => {
    void live.revision;
    const key = plant.key;
    const to = nowS();
    api()
      .samples(key, { since: to - SPARK_S, until: to, step: 900 })
      .then((s) => {
        spark = s;
        sparkTo = to;
      })
      .catch(() => (spark = null));
  });
</script>

<a class="card" href={href.plant(plant.key)}>
  <header>
    <PlantPhoto {plant} size={40} />
    <h3>{plant.name}</h3>
    <StatusBadge status={plant.status} />
  </header>

  <div class="reading">
    <span class="value">{pct(plant.moisture_pct)}</span>
    {#if plant.forecast}
      <span class="rate">−{plant.forecast.rate_pct_per_day.toFixed(1)}%/day</span>
    {/if}
  </div>
  <MoistureBar pct={plant.moisture_pct} threshold={plant.dry_threshold_pct} status={plant.status} />

  <div class="spark">
    {#if spark && spark.t.length > 1}
      <Chart
        t={spark.t}
        pct={spark.pct}
        threshold={plant.dry_threshold_pct}
        from={sparkTo - SPARK_S}
        to={sparkTo}
        height={44}
        compact
      />
    {/if}
  </div>

  <dl>
    <div>
      <dt>Next watering</dt>
      <dd>{plant.status === 'water_now' ? 'now' : until(plant.next_watering)}</dd>
    </div>
    <div>
      <dt>Last watered</dt>
      <dd>{ago(plant.last_watered)}</dd>
    </div>
    <div>
      <dt>Seen</dt>
      <dd>{ago(plant.last_seen)}</dd>
    </div>
  </dl>
</a>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1rem 1.1rem;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
    color: inherit;
    text-decoration: none;
    transition:
      border-color 0.15s,
      transform 0.15s;
  }
  .card:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  h3 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 1rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .reading {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }
  .value {
    font-size: 2rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .rate {
    color: var(--muted);
    font-size: 0.85rem;
  }
  .spark {
    height: 44px;
  }
  dl {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin: 0;
  }
  dt {
    color: var(--muted);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  dd {
    margin: 0.1rem 0 0;
    font-size: 0.85rem;
    font-variant-numeric: tabular-nums;
  }
</style>
