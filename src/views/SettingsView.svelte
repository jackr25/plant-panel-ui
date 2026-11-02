<script lang="ts">
  import { Client, errorText } from '../lib/api';
  import { ago, dateTime } from '../lib/format';
  import { API_VERSION, type Health } from '../lib/icd';
  import { live, settings } from '../lib/state.svelte';

  let draft = $state(settings.server);
  let testing = $state(false);
  let result = $state<{ ok: true; health: Health } | { ok: false; error: string } | null>(null);

  async function test() {
    testing = true;
    try {
      result = { ok: true, health: await new Client(draft.trim()).health() };
    } catch (e) {
      result = { ok: false, error: errorText(e) };
    } finally {
      testing = false;
    }
  }

  function save(e: SubmitEvent) {
    e.preventDefault();
    settings.setServer(draft);
    result = null;
  }

  const h = $derived(live.health);
</script>

<header class="page-head">
  <div>
    <h1>Settings</h1>
  </div>
</header>

<section class="panel">
  <h2>plantd server</h2>
  <form onsubmit={save}>
    <label for="server">Base URL</label>
    <div class="row">
      <input
        id="server"
        bind:value={draft}
        placeholder="http://raspberrypi.local:8080"
        spellcheck="false"
        autocomplete="off"
      />
      <button type="button" onclick={test} disabled={testing}>{testing ? 'Testing…' : 'Test'}</button>
      <button class="primary" type="submit" disabled={draft.trim() === settings.server}>Save</button>
    </div>
    <p class="sub">
      Leave empty to use the page's own origin (when this UI is served by plantd).
    </p>
  </form>
  {#if result?.ok}
    <p class="okmsg">
      Connected: plantd {result.health.version}, API v{result.health.api}, {result.health.plants} plants.
      {#if result.health.api !== API_VERSION}This UI speaks API v{API_VERSION}.{/if}
    </p>
  {:else if result}
    <p class="error">{result.error}</p>
  {/if}
</section>

<section class="panel">
  <h2>Collector status</h2>
  {#if h}
    <dl class="stats">
      <dt>Version</dt>
      <dd>plantd {h.version} (API v{h.api})</dd>
      <dt>Uptime</dt>
      <dd>{(h.uptime_s / 3600).toFixed(1)} h</dd>
      <dt>Plants</dt>
      <dd>{h.plants}</dd>
      <dt>Poll interval</dt>
      <dd>{h.poll_interval_s} s</dd>
      <dt>Last poll</dt>
      <dd>{ago(h.last_poll)}</dd>
      <dt>Last analysis</dt>
      <dd>{dateTime(h.last_analysis)} ({ago(h.last_analysis)})</dd>
    </dl>
  {:else}
    <p class="sub">{live.error ?? 'Not connected.'}</p>
  {/if}
</section>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  label {
    font-weight: 600;
    font-size: 0.9rem;
  }
  .row {
    display: flex;
    gap: 0.5rem;
  }
  input {
    flex: 1;
    min-width: 0;
  }
  .okmsg {
    color: var(--accent);
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
  section + section {
    margin-top: 1rem;
  }
</style>
