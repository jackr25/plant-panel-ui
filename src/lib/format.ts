import type { EventKind, Status } from './icd';

export const nowS = () => Math.floor(Date.now() / 1000);

export function pct(v: number | null | undefined, digits = 1): string {
  return v == null ? '—' : `${v.toFixed(digits)}%`;
}

function span(secs: number): string {
  const s = Math.abs(secs);
  if (s < 90) return `${Math.round(s)} s`;
  if (s < 5400) return `${Math.round(s / 60)} min`;
  if (s < 172_800) return `${Math.round(s / 3600)} h`;
  return `${(s / 86_400).toFixed(1)} days`;
}

export function ago(t: number | null | undefined): string {
  return t == null ? '—' : `${span(nowS() - t)} ago`;
}

/** "in 2.3 days", "now", "3 h overdue". */
export function until(t: number | null | undefined): string {
  if (t == null) return '—';
  const d = t - nowS();
  if (Math.abs(d) < 600) return 'now';
  return d > 0 ? `in ${span(d)}` : `${span(d)} overdue`;
}

export function dateTime(t: number | null | undefined): string {
  if (t == null) return '—';
  return new Date(t * 1000).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const statusLabel: Record<Status, string> = {
  water_now: 'Water now',
  water_soon: 'Water soon',
  offline: 'Offline',
  ok: 'OK',
  no_data: 'No data',
};

/** Most urgent first. */
export const statusRank: Record<Status, number> = {
  water_now: 0,
  water_soon: 1,
  offline: 2,
  ok: 3,
  no_data: 4,
};

export const eventLabel: Record<EventKind, string> = {
  watering: 'Watered',
  rapid_drop: 'Rapid drop',
  dry: 'Went dry',
  offline: 'Offline',
  online: 'Back online',
  node_reboot: 'Node rebooted',
};
