<script lang="ts">
  import { errorText } from '../lib/api';
  import { dateTime, eventLabel, nowS, pct } from '../lib/format';
  import type { EventKind, PlantEvent } from '../lib/icd';
  import { api, href, live } from '../lib/state.svelte';

  const KINDS = Object.keys(eventLabel) as EventKind[];
  let days = $state(30);
  let shown = $state<Set<EventKind>>(new Set(['watering', 'rapid_drop', 'dry', 'offline', 'online']));
  let events = $state<PlantEvent[]>([]);
  let error = $state<string | null>(null);

  const names = $derived(new Map(live.plants.map((p) => [p.key, p.name])));
  const visible = $derived(events.filter((e) => shown.has(e.kind)));

  $effect(() => {
    void live.revision;
    api()
      .events({ since: nowS() - days * 86_400 })
      .then((e) => {
        events = e.reverse();
        error = null;
      })
      .catch((e) => (error = errorText(e)));
  });

  function toggle(k: EventKind) {
    const next = new Set(shown);
    if (!next.delete(k)) next.add(k);
    shown = next;
  }
</script>

<header class="page-head">
  <div>
    <h1>Events</h1>
    <p class="sub">Last {days} days · {visible.length} shown</p>
  </div>
  <div class="seg" role="group" aria-label="Time range">
    {#each [7, 30, 90] as d (d)}
      <button class:active={days === d} onclick={() => (days = d)}>{d} d</button>
    {/each}
  </div>
</header>

<div class="filters">
  {#each KINDS as k (k)}
    <button class="chip" class:on={shown.has(k)} onclick={() => toggle(k)}>
      <span class="dot {k}"></span>{eventLabel[k]}
    </button>
  {/each}
</div>

{#if error}
  <p class="error">{error}</p>
{:else if visible.length}
  <ul class="panel list">
    {#each visible as e (e.t + e.kind + e.sensor_id)}
      <li>
        <span class="dot {e.kind}"></span>
        <a href={href.plant(e.plant)}>{names.get(e.plant) ?? e.plant}</a>
        <span>{eventLabel[e.kind]}{e.from_pct != null && e.pct != null
            ? ` ${pct(e.from_pct, 0)} → ${pct(e.pct, 0)}`
            : e.pct != null
              ? ` at ${pct(e.pct, 0)}`
              : ''}</span>
        <time class="sub">{dateTime(e.t)}</time>
      </li>
    {/each}
  </ul>
{:else}
  <p class="sub">No events.</p>
{/if}

<style>
  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 1rem;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    opacity: 0.5;
  }
  .chip.on {
    opacity: 1;
  }
  .list {
    list-style: none;
    margin: 0;
  }
  .list li {
    display: grid;
    grid-template-columns: auto minmax(8rem, 1fr) 2fr auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 0;
    border-bottom: 1px solid var(--border);
  }
  .list li:last-child {
    border-bottom: 0;
  }
  @media (max-width: 600px) {
    .list li {
      grid-template-columns: auto 1fr;
    }
    .list li time,
    .list li > span:nth-of-type(2) {
      grid-column: 2;
    }
  }
</style>
