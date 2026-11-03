<script lang="ts">
  import type { PlantSummary } from '../icd';
  import { photoUrl } from '../photo';

  let { plant, size = 44 }: { plant: PlantSummary; size?: number } = $props();

  let src = $state<string | null>(null);

  $effect(() => {
    // Keeps showing the previous image until the new one resolves (no flicker on refresh).
    const pending = photoUrl(plant);
    if (!pending) {
      src = null;
      return;
    }
    let current = true;
    pending.then(
      (u) => current && (src = u),
      () => {},
    );
    return () => (current = false);
  });
</script>

<span class="photo" style:--size="{size}px" aria-hidden={!src}>
  {#if src}
    <img {src} alt={plant.name} />
  {:else}
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21c0-6 1-10 7-14-1 6-3 10-7 11m0 3c0-4-1-7-6-9 1 4 3 7 6 7"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  {/if}
</span>

<style>
  .photo {
    flex: none;
    display: grid;
    place-items: center;
    width: var(--size);
    height: var(--size);
    overflow: hidden;
    border-radius: calc(var(--size) * 0.22);
    background: var(--accent-soft);
    color: var(--accent);
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  svg {
    width: 55%;
    height: 55%;
  }
</style>
