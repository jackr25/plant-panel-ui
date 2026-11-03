<script lang="ts">
  import { errorText } from '../api';
  import { fromLocalInput, nowS, toLocalInput } from '../format';
  import type { PlantSummary } from '../icd';
  import { api, live } from '../state.svelte';

  let { plant, onclose }: { plant: PlantSummary; onclose: () => void } = $props();

  const opened = toLocalInput(nowS());
  let when = $state(opened);
  let busy = $state(false);
  let error = $state<string | null>(null);

  async function save(e: SubmitEvent) {
    e.preventDefault();
    const t = fromLocalInput(when);
    if (t == null) {
      error = 'Pick a date and time.';
      return;
    }
    if (t > nowS()) {
      error = "That's in the future.";
      return;
    }
    busy = true;
    error = null;
    try {
      // Untouched means "now": let the collector stamp it with its own clock.
      const p = await api().addWatering(plant.sensor_id, when === opened ? {} : { t });
      live.historyChanged(p);
      onclose();
    } catch (err) {
      error = errorText(err);
    } finally {
      busy = false;
    }
  }
</script>

<form class="panel" onsubmit={save}>
  <h2>Log a watering</h2>
  <p class="sub">
    For a watering the sensor missed, or one from before it was installed. It counts toward the
    watering history and the forecast, just like a sensed one.
  </p>

  <label>
    <span>When</span>
    <input type="datetime-local" bind:value={when} max={toLocalInput(nowS())} required />
  </label>

  {#if error}<p class="error">{error}</p>{/if}

  <div class="actions">
    <button type="button" onclick={onclose} disabled={busy}>Cancel</button>
    <button class="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Log watering'}</button>
  </div>
</form>

<style>
  label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-top: 0.9rem;
    max-width: 16rem;
  }
  label > span {
    font-weight: 600;
    font-size: 0.9rem;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }
</style>
