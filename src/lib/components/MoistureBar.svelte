<script lang="ts">
  import type { Status } from '../icd';

  let { pct, threshold, status }: { pct: number | null; threshold: number; status: Status } = $props();
</script>

<div
  class="bar {status}"
  role="meter"
  aria-label="Soil moisture"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={pct ?? undefined}
>
  <div class="fill" style:width="{Math.max(0, Math.min(100, pct ?? 0))}%"></div>
  <div class="threshold" style:left="{threshold}%" title="Dry threshold {threshold}%"></div>
</div>

<style>
  .bar {
    position: relative;
    height: 8px;
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    border-radius: inherit;
    background: var(--accent);
    transition: width 0.4s ease;
  }
  .water_soon .fill {
    background: var(--warn);
  }
  .water_now .fill {
    background: var(--danger);
  }
  .offline .fill,
  .no_data .fill {
    background: var(--muted);
  }
  .threshold {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: var(--danger);
    opacity: 0.7;
  }
</style>
