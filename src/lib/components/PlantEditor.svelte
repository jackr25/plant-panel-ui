<script lang="ts">
  import { untrack } from 'svelte';
  import { errorText } from '../api';
  import { NAME_MAX_CHARS, NOTES_MAX_CHARS, type PlantSummary, type PlantUpdate } from '../icd';
  import { downscale } from '../photo';
  import { api, href, live, router } from '../state.svelte';
  import PlantPhoto from './PlantPhoto.svelte';

  let { plant, onclose }: { plant: PlantSummary; onclose: () => void } = $props();

  // Drafts start from the plant as it was when the editor opened, not as it refreshes.
  const initial = untrack(() => plant);
  let name = $state(initial.name);
  let threshold = $state<number | null>(initial.dry_threshold_pct);
  let notes = $state(initial.notes ?? '');
  let file = $state<File | null>(null);
  let removePhoto = $state(false);
  let busy = $state(false);
  let error = $state<string | null>(null);
  let confirmingClear = $state(false);

  const preview = $derived(file ? URL.createObjectURL(file) : null);
  $effect(() => {
    const url = preview;
    return () => url && URL.revokeObjectURL(url);
  });

  function pick(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    file = input.files?.[0] ?? null;
    if (file) removePhoto = false;
    input.value = '';
  }

  /** Only what changed; an empty field resets to the collector's default. */
  function changes(): PlantUpdate {
    const u: PlantUpdate = {};
    if (name.trim() !== plant.name) u.name = name.trim() || null;
    if (notes.trim() !== (plant.notes ?? '')) u.notes = notes.trim() || null;
    // A cleared number input binds as null (or NaN in some engines).
    const thr = threshold == null || Number.isNaN(threshold) ? null : threshold;
    if (thr !== plant.dry_threshold_pct) u.dry_threshold_pct = thr;
    return u;
  }

  async function clearHistory() {
    busy = true;
    error = null;
    try {
      live.historyChanged(await api().clearHistory(plant.sensor_id));
      onclose();
    } catch (err) {
      error = errorText(err);
    } finally {
      busy = false;
      confirmingClear = false;
    }
  }

  async function save(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    error = null;
    const client = api();
    const oldKey = plant.key;
    try {
      let p = plant;
      const u = changes();
      if (Object.keys(u).length) p = await client.updatePlant(p.sensor_id, u);
      if (file) p = await client.uploadPhoto(p.sensor_id, await downscale(file));
      else if (removePhoto && p.photo) p = await client.deletePhoto(p.sensor_id);
      // Same tick, so the view never looks up the old key against the new list.
      live.replace(p);
      if (p.key !== oldKey) router.replace(href.plant(p.key));
      else onclose();
    } catch (err) {
      error = errorText(err);
    } finally {
      busy = false;
    }
  }
</script>

<form class="panel" onsubmit={save}>
  <h2>Edit plant</h2>

  <div class="grid">
    <div class="photo-col">
      {#if preview}
        <img class="preview" src={preview} alt="Selected" />
      {:else if removePhoto}
        <PlantPhoto plant={{ ...plant, photo: null }} size={140} />
      {:else}
        <PlantPhoto {plant} size={140} />
      {/if}
      <label class="file">
        <input type="file" accept="image/jpeg,image/png,image/webp" onchange={pick} />
        {plant.photo || file ? 'Replace photo' : 'Add photo'}
      </label>
      {#if (plant.photo && !removePhoto) || file}
        <button
          type="button"
          class="link"
          onclick={() => {
            file = null;
            removePhoto = !!plant.photo;
          }}>Remove photo</button
        >
      {/if}
    </div>

    <div class="fields">
      <label>
        <span>Name</span>
        <input bind:value={name} maxlength={NAME_MAX_CHARS} placeholder={plant.hostname} />
        <small class="sub">Renaming changes the plant's key in links and reports. Empty restores the default.</small>
      </label>

      <label>
        <span>Water below</span>
        <span class="unit">
          <input type="number" bind:value={threshold} min="1" max="99" step="0.5" placeholder="default" />
          %
        </span>
        <small class="sub">Moisture that counts as dry for this plant. Empty uses the collector's default.</small>
      </label>

      <label>
        <span>Notes</span>
        <textarea bind:value={notes} rows="5" maxlength={NOTES_MAX_CHARS} placeholder="Species, light, soil, care tips…"
        ></textarea>
        <small class="sub">Also included in the text report, so local LLMs see it.</small>
      </label>
    </div>
  </div>

  {#if error}<p class="error">{error}</p>{/if}

  <div class="actions">
    <button type="button" onclick={onclose} disabled={busy}>Cancel</button>
    <button class="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
  </div>

  <section class="danger-zone">
    <div>
      <h3>Clear history</h3>
      <p class="sub">
        Deletes every moisture sample, event and watering of this plant, for example after moving the
        sensor to a new pot. Name, notes, photo and threshold stay. This can't be undone.
      </p>
    </div>
    {#if confirmingClear}
      <div class="confirm" role="group" aria-label="Confirm clearing history">
        <button type="button" onclick={() => (confirmingClear = false)} disabled={busy}>Keep it</button>
        <button type="button" class="danger" onclick={clearHistory} disabled={busy}>
          {busy ? 'Clearing…' : 'Delete all history'}
        </button>
      </div>
    {:else}
      <button type="button" onclick={() => (confirmingClear = true)} disabled={busy}>Clear history…</button>
    {/if}
  </section>
</form>

<style>
  .grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1.25rem;
  }
  .photo-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .preview {
    width: 140px;
    height: 140px;
    object-fit: cover;
    border-radius: 31px;
  }
  .file {
    position: relative;
    padding: 0.4rem 0.85rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    font-size: 0.9rem;
    cursor: pointer;
  }
  .file:hover,
  .file:focus-within {
    border-color: var(--accent);
  }
  .file input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .link {
    border: 0;
    padding: 0;
    background: none;
    color: var(--danger);
    font-size: 0.85rem;
  }
  .fields {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 0;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  label > span:first-child {
    font-weight: 600;
    font-size: 0.9rem;
  }
  .unit {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .unit input {
    width: 6rem;
  }
  textarea {
    resize: vertical;
    min-height: 5rem;
  }
  small.sub {
    margin: 0;
    font-size: 0.78rem;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .danger-zone {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem 1.25rem;
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }
  .danger-zone > div:first-child {
    flex: 1 1 18rem;
  }
  .danger-zone h3 {
    margin: 0;
    font-size: 0.9rem;
  }
  .confirm {
    display: flex;
    gap: 0.5rem;
  }
  button.danger {
    border-color: var(--danger);
    background: var(--danger);
    color: #fff;
  }
  @media (max-width: 560px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
