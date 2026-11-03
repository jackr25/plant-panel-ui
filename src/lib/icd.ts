// TypeScript mirror of the plantd ICD v1 (plant-panel/docs/ICD.md, crate `plant-icd`).
// Keep in step with crates/plant-icd/src/api.rs. Times are unix seconds, moisture is percent.

export const API_VERSION = 1;
export const API_PREFIX = '/api/v1';

export type Status = 'ok' | 'water_soon' | 'water_now' | 'offline' | 'no_data';
export type Model = 'linear' | 'exponential';
export type EventKind = 'watering' | 'rapid_drop' | 'dry' | 'offline' | 'online' | 'node_reboot';

export interface Health {
  api: number;
  version: string;
  uptime_s: number;
  plants: number;
  poll_interval_s: number;
  last_poll: number | null;
  last_analysis: number | null;
}

export interface Forecast {
  model: Model;
  /** %/day for linear, 1/day for exponential. */
  k_per_day: number;
  floor_pct: number;
  /** Drying rate at the current moisture, %/day. */
  rate_pct_per_day: number;
  confidence: number;
  points: number;
  fitted_at: number;
}

export interface DayStats {
  min_pct: number;
  mean_pct: number;
  max_pct: number;
  samples: number;
}

export interface History {
  horizon_days: number;
  waterings: number;
  median_interval_days: number | null;
}

export interface PlantSummary {
  key: string;
  name: string;
  sensor_id: string;
  hostname: string;
  status: Status;
  moisture_pct: number | null;
  last_seen: number | null;
  rssi: number | null;
  dry_threshold_pct: number;
  last_watered: number | null;
  next_watering: number | null;
  forecast: Forecast | null;
  day: DayStats | null;
  history: History | null;
  /** Free text, may contain newlines. */
  notes: string | null;
  /** Fetch from `/plants/{key}/photo`; `updated` changes on every upload. */
  photo: Photo | null;
}

export interface Photo {
  content_type: string;
  bytes: number;
  updated: number;
}

/** `PATCH /plants/{key}`: omit a field to leave it, `null` resets it to the default. */
export interface PlantUpdate {
  name?: string | null;
  notes?: string | null;
  dry_threshold_pct?: number | null;
}

export const NAME_MAX_CHARS = 64;
export const NOTES_MAX_CHARS = 4000;
export const PHOTO_MAX_BYTES = 4 << 20;

export interface Series {
  sensor_id: string;
  step_s: number;
  t: number[];
  pct: number[];
}

export interface PlantEvent {
  t: number;
  kind: EventKind;
  plant: string;
  sensor_id: string;
  from_pct?: number;
  pct?: number;
  /** A watering entered by hand rather than sensed. Absent means false. */
  manual?: boolean;
}

/** `POST /plants/{key}/waterings`. Omit `t` for now; it must not be in the future. */
export interface WateringEntry {
  t?: number;
}

export interface Report {
  api: number;
  generated: number;
  horizon_days: number;
  plants: PlantSummary[];
}

/** Moisture after `days` of drying from `pct`, per the fitted model. */
export function project(f: Forecast, pct: number, days: number): number {
  return f.model === 'linear'
    ? pct - f.k_per_day * days
    : f.floor_pct + (pct - f.floor_pct) * Math.exp(-f.k_per_day * days);
}
