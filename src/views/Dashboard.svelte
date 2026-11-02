<script lang="ts">
  import PlantCard from '../lib/components/PlantCard.svelte';
  import { statusRank } from '../lib/format';
  import { href, live } from '../lib/state.svelte';

  const plants = $derived(
    [...live.plants].sort(
      (a, b) => statusRank[a.status] - statusRank[b.status] || a.name.localeCompare(b.name),
    ),
  );
  const thirsty = $derived(plants.filter((p) => p.status === 'water_now' || p.status === 'water_soon'));
</script>

<section>
  <header class="page-head">
    <div>
      <h1>Plants</h1>
      <p class="sub">
        {#if live.loading}
          Loading…
        {:else if !plants.length}
          No sensors yet
        {:else if thirsty.length}
          {thirsty.length} of {plants.length} need water: {thirsty.map((p) => p.name).join(', ')}
        {:else}
          All {plants.length} plants are fine
        {/if}
      </p>
    </div>
  </header>

  {#if plants.length}
    <div class="grid">
      {#each plants as plant (plant.key)}
        <PlantCard {plant} />
      {/each}
    </div>
  {:else if !live.loading && !live.error}
    <div class="empty">
      <p>plantd is running but hasn't found any soil nodes.</p>
      <p class="sub">
        Nodes are discovered over mDNS (<code>_soilnode._tcp</code>) or listed under
        <code>[discovery] static_hosts</code> in <code>/etc/plant-panel/plantd.toml</code>. They show up
        after the next poll.
      </p>
    </div>
  {:else if live.error}
    <div class="empty">
      <p>Can't reach plantd.</p>
      <p class="sub">Check the server address in <a href={href.settings}>Settings</a>.</p>
    </div>
  {/if}
</section>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 1rem;
  }
  .empty {
    padding: 2rem;
    border: 1px dashed var(--border);
    border-radius: 14px;
    text-align: center;
  }
</style>
