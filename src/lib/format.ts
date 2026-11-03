import type { EventKind, PlantEvent, Status } from './icd';

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

/** "Watered 31% → 58%", "Went dry at 29%", "Watered (logged by hand)". */
export function eventText(e: PlantEvent): string {
  const detail =
    e.from_pct != null && e.pct != null
      ? ` ${pct(e.from_pct, 0)} → ${pct(e.pct, 0)}`
      : e.pct != null
        ? ` at ${pct(e.pct, 0)}`
        : '';
  return `${eventLabel[e.kind]}${detail}${e.manual ? ' (logged by hand)' : ''}`;
}

/** Unix seconds as the value of an `<input type="datetime-local">`, in local time. */
export function toLocalInput(t: number): string {
  const d = new Date(t * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** The inverse of {@link toLocalInput}; `null` if the input is empty or invalid. */
export function fromLocalInput(v: string): number | null {
  const ms = new Date(v).getTime();
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}
