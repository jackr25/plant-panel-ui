<script lang="ts">
  import { href, live, router, settings } from './lib/state.svelte';
  import { ago } from './lib/format';
  import Dashboard from './views/Dashboard.svelte';
  import EventsView from './views/EventsView.svelte';
  import PlantView from './views/PlantView.svelte';
  import ReportView from './views/ReportView.svelte';
  import SettingsView from './views/SettingsView.svelte';

  // (Re)start polling whenever the server changes.
  $effect(() => {
    void settings.server;
    return live.start();
  });

  const nav = [
    { label: 'Plants', href: href.dashboard, active: ['dashboard', 'plant'] },
    { label: 'Events', href: href.events, active: ['events'] },
    { label: 'Report', href: href.report, active: ['report'] },
    { label: 'Settings', href: href.settings, active: ['settings'] },
  ];
  const route = $derived(router.route);
</script>

<div class="shell">
  <nav>
    <a class="brand" href={href.dashboard}>
      <img src="/favicon.svg" alt="" width="22" height="22" />
      Plant Panel
    </a>
    <div class="links">
      {#each nav as item (item.href)}
        <a href={item.href} class:active={item.active.includes(route.name)}>{item.label}</a>
      {/each}
    </div>
    <span
      class="conn"
      class:bad={live.error}
      title={live.error ?? `Connected to ${settings.server || location.origin}`}
    >
      {live.error ? 'offline' : live.health ? `polled ${ago(live.health.last_poll)}` : '…'}
    </span>
  </nav>

  {#if live.error && live.health}
    <div class="banner">Lost connection to plantd: {live.error}. Showing the last data received.</div>
  {/if}

  <main>
    {#if route.name === 'plant'}
      {#key route.key}<PlantView key={route.key} />{/key}
    {:else if route.name === 'events'}
      <EventsView />
    {:else if route.name === 'report'}
      <ReportView />
    {:else if route.name === 'settings'}
      <SettingsView />
    {:else}
      <Dashboard />
    {/if}
  </main>
</div>

<style>
  .shell {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  nav {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 0.7rem 1.5rem;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(8px);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    color: var(--text);
    text-decoration: none;
  }
  .links {
    display: flex;
    gap: 0.25rem;
    flex: 1;
  }
  .links a {
    padding: 0.35rem 0.7rem;
    border-radius: 8px;
    color: var(--muted);
    text-decoration: none;
    font-size: 0.9rem;
  }
  .links a:hover {
    color: var(--text);
  }
  .links a.active {
    color: var(--text);
    background: var(--surface-2);
  }
  .conn {
    font-size: 0.75rem;
    color: var(--muted);
    white-space: nowrap;
  }
  .conn::before {
    content: '●';
    margin-right: 0.35em;
    color: var(--accent);
  }
  .conn.bad::before {
    color: var(--danger);
  }
  .banner {
    padding: 0.5rem 1.5rem;
    background: var(--danger-soft);
    color: var(--danger);
    font-size: 0.85rem;
  }
  main {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem;
    box-sizing: border-box;
  }
  @media (max-width: 640px) {
    nav {
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      padding: 0.6rem 1rem;
    }
    .links {
      order: 3;
      flex-basis: 100%;
      overflow-x: auto;
    }
    main {
      padding: 1rem;
    }
  }
</style>
