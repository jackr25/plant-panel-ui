// plantd HTTP client. Inside Tauri, requests go through the Rust HTTP plugin (no CORS
// or mixed-content rules, OS-level mDNS `.local` resolution). In a plain browser, e.g.
// when this UI is served from the Pi, it uses window.fetch.

import { isTauri } from '@tauri-apps/api/core';
import {
  API_PREFIX,
  type Health,
  type PlantEvent,
  type PlantSummary,
  type PlantUpdate,
  type Report,
  type Series,
  type WateringEntry,
} from './icd';

type Fetch = typeof globalThis.fetch;
type Params = Record<string, string | number | undefined>;

const TIMEOUT_MS = 8000;
/** Photo uploads can be a few MB over Wi-Fi. */
const UPLOAD_TIMEOUT_MS = 60_000;

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

  private async request(
    path: string,
    params?: Params,
    init?: RequestInit,
    timeoutMs = TIMEOUT_MS,
  ): Promise<Response> {
    const f = await getFetch();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
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
  /** Returns the updated plant; its `key` changes when the name does. */
  updatePlant = async (key: string, u: PlantUpdate): Promise<PlantSummary> =>
    (
      await this.request(`/plants/${encodeURIComponent(key)}`, undefined, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(u),
      })
    ).json();
  photo = async (key: string): Promise<Blob> =>
    (await this.request(`/plants/${encodeURIComponent(key)}/photo`)).blob();
  uploadPhoto = async (key: string, image: Blob): Promise<PlantSummary> =>
    (
      await this.request(
        `/plants/${encodeURIComponent(key)}/photo`,
        undefined,
        { method: 'PUT', headers: { 'Content-Type': image.type }, body: image },
        UPLOAD_TIMEOUT_MS,
      )
    ).json();
  deletePhoto = async (key: string): Promise<PlantSummary> =>
    (await this.request(`/plants/${encodeURIComponent(key)}/photo`, undefined, { method: 'DELETE' })).json();
  /** Records a watering the sensor missed. `409` if one is already recorded near `t`. */
  addWatering = async (key: string, entry: WateringEntry = {}): Promise<PlantSummary> =>
    (
      await this.request(`/plants/${encodeURIComponent(key)}/waterings`, undefined, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
    ).json();
  /** Deletes the plant's samples, events and analysis. Name, notes and photo stay. */
  clearHistory = async (key: string): Promise<PlantSummary> =>
    (await this.request(`/plants/${encodeURIComponent(key)}/history`, undefined, { method: 'DELETE' })).json();
  analyze = async () => {
    await this.request('/analyze', undefined, { method: 'POST' });
  };
}
