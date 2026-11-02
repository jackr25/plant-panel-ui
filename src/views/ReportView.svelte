<script lang="ts">
  import { errorText } from '../lib/api';
  import { ago } from '../lib/format';
  import { api, live } from '../lib/state.svelte';

  let kind = $state<'daily' | 'live'>('daily');
  let text = $state('');
  let error = $state<string | null>(null);
  let busy = $state(false);
  let copied = $state(false);

  async function load() {
    try {
      text = kind === 'daily' ? await api().reportText() : await api().liveText();
      error = null;
    } catch (e) {
      text = '';
      error = errorText(e);
    }
  }

  $effect(() => {
    void kind;
    void live.revision;
    void load();
  });

  async function analyze() {
    busy = true;
    try {
      await api().analyze();
      // plantd queues the run on its scheduler thread; it finishes in milliseconds.
      await new Promise((r) => setTimeout(r, 1500));
      await live.refresh();
      kind = 'daily';
      await load();
    } catch (e) {
      error = errorText(e);
    } finally {
      busy = false;
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<header class="page-head">
  <div>
    <h1>Report</h1>
    <p class="sub">
      Plain-text, regex-friendly summary for people, scripts and local LLMs. Last analysis {ago(
        live.health?.last_analysis,
      )}.
    </p>
  </div>
  <div class="actions">
    <div class="seg" role="group" aria-label="Report kind">
      <button class:active={kind === 'daily'} onclick={() => (kind = 'daily')}>Daily</button>
      <button class:active={kind === 'live'} onclick={() => (kind = 'live')}>Live</button>
    </div>
    <button onclick={copy} disabled={!text}>{copied ? 'Copied' : 'Copy'}</button>
    <button class="primary" onclick={analyze} disabled={busy}>{busy ? 'Analyzing…' : 'Run analysis'}</button>
  </div>
</header>

{#if error}
  <p class="error">{error}</p>
{:else}
  <pre class="panel">{text}</pre>
{/if}

<style>
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  pre {
    margin: 0;
    overflow-x: auto;
    font-size: 0.8rem;
    line-height: 1.5;
    white-space: pre;
  }
</style>
