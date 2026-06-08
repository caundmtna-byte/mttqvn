import type { Option } from '@/components/ui/Combobox';
import { QUA_TANG_SEED_SUGGESTIONS } from '../core/constants';
import type { ThamHoiCaNhan } from '../core/types';

export function buildQuaTangOptions(
  rows: ThamHoiCaNhan[],
  currentValue?: string | null,
): Option[] {
  const seen = new Map<string, Option>();

  for (const s of QUA_TANG_SEED_SUGGESTIONS) {
    seen.set(s.toLowerCase(), { label: s, value: s });
  }

  for (const r of rows) {
    const t = r.qua_tang?.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (!seen.has(k)) seen.set(k, { label: t, value: t });
  }

  const cur = String(currentValue ?? '').trim();
  if (cur) {
    const k = cur.toLowerCase();
    if (!seen.has(k)) seen.set(k, { label: cur, value: cur });
  }

  return [...seen.values()].sort((a, b) =>
    a.label.localeCompare(b.label, 'vi', { sensitivity: 'base' }),
  );
}
