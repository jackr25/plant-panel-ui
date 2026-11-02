// plantd HTTP client. Inside Tauri, requests go through the Rust HTTP plugin (no CORS
// or mixed-content rules, OS-level mDNS `.local` resolution). In a plain browser, e.g.
// when this UI is served from the Pi, it uses window.fetch.

import { isTauri } from '@tauri-apps/api/core';
import {
  API_PREFIX,
  type Health,
  type PlantEvent,
  type PlantSummary,
  type Report,
  type Series,
} from './icd';

type Fetch = typeof globalThis.fetch;
type Params = Record<string, string | number | undefined>;

const TIMEOUT_MS = 8000;

let fetcher: Promise<Fetch> | undefined;
function getFetch(): Promise<Fetch> {
  fetcher ??= isTauri()
    ? import('@tauri-apps/plugin-http').then((m) => m.fetch as Fetch)
    : Promise.resolve(globalThis.fetch.bind(globalThis));
  return fetcher;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function errorText(e: unknown): string {
  if (e instanceof ApiError) return e.status ? `${e.status}: ${e.message}` : e.message;
  if (e instanceof Error) return e.name === 'AbortError' ? 'request timed out' : e.message;
  return String(e);
}

export class Client {
  /** `base` is e.g. `http://ngspthree.local:8080`, or `''` for same-origin. */
  constructor(readonly base: string) {}

  private url(path: string, params?: Params): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined) q.set(k, String(v));
    const qs = q.toString();
    return `${this.base.replace(/\/+$/, '')}${API_PREFIX}${path}${qs ? `?${qs}` : ''}`;
  }

  private async request(path: string, params?: Params, init?: RequestInit): Promise<Response> {
    const f = await getFetch();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await f(this.url(path, params), { ...init, signal: ctrl.signal });
    } catch (e) {
      throw new ApiError(0, errorText(e));
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      let msg = res.statusText;
      try {
        msg = ((await res.json()) as { error?: string }).error ?? msg;
      } catch {
        // non-JSON error body
      }
      throw new ApiError(res.status, msg);
    }
    return res;
  }

  private async json<T>(path: string, params?: Params): Promise<T> {
    return (await this.request(path, params)).json() as Promise<T>;
  }

  private async text(path: string, params?: Params): Promise<string> {
    return (await this.request(path, params)).text();
  }

  health = () => this.json<Health>('/health');
  plants = () => this.json<PlantSummary[]>('/plants');
  plant = (key: string) => this.json<PlantSummary>(`/plants/${encodeURIComponent(key)}`);
  samples = (key: string, q: { since?: number; until?: number; step?: number } = {}) =>
    this.json<Series>(`/plants/${encodeURIComponent(key)}/samples`, q);
  events = (q: { since?: number; plant?: string } = {}) => this.json<PlantEvent[]>('/events', q);
  report = () => this.json<Report>('/report.json');
  reportText = () => this.text('/report.txt');
  liveText = () => this.text('/live.txt');
  analyze = async () => {
    await this.request('/analyze', undefined, { method: 'POST' });
  };
}
