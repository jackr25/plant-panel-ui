<script lang="ts">
  import type { Status } from '../icd';
  import { statusLabel } from '../format';

  let { status }: { status: Status } = $props();
</script>

<span class="badge {status}">{statusLabel[status]}</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
    padding: 0.15em 0.6em;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    background: var(--surface-2);
    color: var(--muted);
  }
  .badge::before {
    content: '';
    width: 0.5em;
    height: 0.5em;
    border-radius: 50%;
    background: currentColor;
  }
  .ok {
    color: var(--accent);
    background: var(--accent-soft);
  }
  .water_soon {
    color: var(--warn);
    background: var(--warn-soft);
  }
  .water_now {
    color: var(--danger);
    background: var(--danger-soft);
  }
</style>
