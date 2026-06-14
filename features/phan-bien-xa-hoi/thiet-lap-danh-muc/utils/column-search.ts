import type { PbxhThietLap } from '../core/types';
import { getPbxhThietLapColumnDisplayValue } from './column-display';

export function countPbxhColumnSearchActive(
  columnSearch: Record<string, string>,
  moTaBucket: '' | 'has' | 'empty',
): number {
  let n = 0;
  for (const v of Object.values(columnSearch)) {
    if (v?.trim()) n += 1;
  }
  if (moTaBucket === 'has' || moTaBucket === 'empty') n += 1;
  return n;
}

export function pbxhMatchesColumnSearch(
  item: PbxhThietLap,
  columnSearch: Record<string, string>,
  moTaBucket: '' | 'has' | 'empty',
): boolean {
  for (const [colId, term] of Object.entries(columnSearch)) {
    const t = term?.trim();
    if (!t) continue;
    const val = getPbxhThietLapColumnDisplayValue(item, colId).toLowerCase();
    if (!val.includes(t.toLowerCase())) return false;
  }
  const mo = (item.mo_ta ?? '').trim();
  if (moTaBucket === 'has' && !mo) return false;
  if (moTaBucket === 'empty' && mo) return false;
  return true;
}
