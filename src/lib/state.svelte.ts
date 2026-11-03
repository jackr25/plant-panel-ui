// App-wide reactive state: the server setting, the live plant list, and the hash router.

import { isTauri } from '@tauri-apps/api/core';
import { Client, errorText } from './api';
import type { Health, PlantSummary } from './icd';

const SERVER_KEY = 'plant-panel.server';
const DEFAULT_SERVER = 'http://ngspthree.local:8080';
const REFRESH_MS = 60_000;

function initialServer(): string {
  try {
    const saved = localStorage.getItem(SERVER_KEY);
    if (saved !== null) return saved;
  } catch {
    // storage unavailable
  }
  // Served by plantd itself (not the Vite dev server): talk to our own origin.
  if (!isTauri() && location.protocol.startsWith('http') && location.port !== '1420') return '';
  return DEFAULT_SERVER;
}

class Settings {
  server = $state(initialServer());

  setServer(url: string) {
    this.server = url.trim().replace(/\/+$/, '');
    try {
      localStorage.setItem(SERVER_KEY, this.server);
    } catch {
      // not persisted; still applies for this session
    }
  }
}

export const settings = new Settings();

export function api(): Client {
  return new Client(settings.server);
}

/** Plant list + health, refreshed on a timer and whenever the server changes. */
class Live {
  plants = $state<PlantSummary[]>([]);
  health = $state<Health | null>(null);
  error = $state<string | null>(null);
  loading = $state(true);
  /** Bumped after every successful refresh; views key their own fetches off it. */
  revision = $state(0);
  #timer: ReturnType<typeof setInterval> | undefined;

  async refresh() {
    const client = api();
    try {
      const [health, plants] = await Promise.all([client.health(), client.plants()]);
      if (client.base !== settings.server) return; // server changed mid-flight
      this.health = health;
      this.plants = plants;
      this.error = null;
      this.revision++;
    } catch (e) {
      this.error = errorText(e);
    } finally {
      this.loading = false;
    }
  }

  /** Starts polling; returns a stop function (for `$effect`). */
  start(): () => void {
    this.loading = true;
    this.plants = [];
    this.health = null;
    void this.refresh();
    this.#timer = setInterval(() => void this.refresh(), REFRESH_MS);
    return () => clearInterval(this.#timer);
  }

  /** Swaps in a plant returned by an edit, matched by sensor id (the key may have changed). */
  replace(p: PlantSummary) {
    const i = this.plants.findIndex((q) => q.sensor_id === p.sensor_id);
    if (i >= 0) this.plants[i] = p;
  }

  /** After a history edit: swap in the returned plant now, then refresh once the
   * collector's re-analysis has had a moment, which also makes views refetch. */
  historyChanged(p: PlantSummary) {
    this.replace(p);
    this.revision++;
    setTimeout(() => void this.refresh(), 1500);
  }

  find(key: string): PlantSummary | undefined {
    return this.plants.find((p) => p.key === key || p.sensor_id === key);
  }
}

export const live = new Live();

export type Route =
  | { name: 'dashboard' }
  | { name: 'plant'; key: string }
  | { name: 'events' }
  | { name: 'report' }
  | { name: 'settings' };

function parseHash(hash: string): Route {
  const [page, arg] = hash.replace(/^#\/?/, '').split('/');
  switch (page) {
    case 'plant':
      return arg ? { name: 'plant', key: decodeURIComponent(arg) } : { name: 'dashboard' };
    case 'events':
    case 'report':
    case 'settings':
      return { name: page };
    default:
      return { name: 'dashboard' };
  }
}

class Router {
  route = $state<Route>(parseHash(location.hash));

  constructor() {
    addEventListener('hashchange', () => (this.route = parseHash(location.hash)));
  }

  /** Swaps the current history entry for `hash` without a navigation, e.g. after a
   * rename changes the plant's key (the old URL is dead, so Back shouldn't return to it). */
  replace(hash: string) {
    history.replaceState(history.state, '', hash);
    this.route = parseHash(hash);
  }
}

export const router = new Router();

export const href = {
  dashboard: '#/',
  plant: (key: string) => `#/plant/${encodeURIComponent(key)}`,
  events: '#/events',
  report: '#/report',
  settings: '#/settings',
};
