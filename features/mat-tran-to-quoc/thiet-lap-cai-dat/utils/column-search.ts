import type { MttqThietLap, MttqThietLapFilters } from '../core/types';

export function countMttqColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
  moTaBucket: MttqThietLapFilters['mo_ta_bucket'] | undefined,
): number {
  if (!columnSearch) return 0;
  let n = 0;
  const skipMoTa = moTaBucket === 'has' || moTaBucket === 'empty';
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (!q.trim()) continue;
    if (skipMoTa && colId === 'mo_ta') continue;
    n += 1;
  }
  return n;
}

export function mttqMatchesColumnSearch(
  row: MttqThietLap,
  columnSearch: Record<string, string> | undefined,
  moTaBucket?: MttqThietLapFilters['mo_ta_bucket'],
): boolean {
  if (!columnSearch) return true;
  const skipMoTa = moTaBucket === 'has' || moTaBucket === 'empty';
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    if (skipMoTa && colId === 'mo_ta') continue;
    const key = colId as keyof MttqThietLap;
    const v = row[key];
    const raw = v == null ? '' : String(v);
    if (!raw.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}
