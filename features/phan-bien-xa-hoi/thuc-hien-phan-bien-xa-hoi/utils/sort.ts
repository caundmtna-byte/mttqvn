import { getLanguage } from '@/lib/utils';
import type { ThucHienPhanBien } from '../core/types';
import type { SortState } from '@/store/createGenericStore';
import { getThucHienColumnDisplayValue } from './column-display';

const COMPUTED_SORT_COLUMNS = new Set([
  'don_vi_thuc_hien',
  'tien_do',
  'ho_va_ten_nguoi_tao',
]);

function getSortValue(item: ThucHienPhanBien, colId: string): string | number {
  if (COMPUTED_SORT_COLUMNS.has(colId)) {
    return getThucHienColumnDisplayValue(item, colId);
  }
  const raw = (item as unknown as Record<string, unknown>)[colId];
  if (typeof raw === 'number') return raw;
  return String(raw ?? '');
}

export function sortThucHienPhanBienList(
  rows: ThucHienPhanBien[],
  sort: SortState,
): ThucHienPhanBien[] {
  const sorted = [...rows];
  if (sort.column && sort.direction) {
    const colId = sort.column;
    sorted.sort((a, b) => {
      const aVal = getSortValue(a, colId);
      const bVal = getSortValue(b, colId);
      const cmp =
        typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), getLanguage());
      return sort.direction === 'desc' ? -cmp : cmp;
    });
  } else {
    sorted.sort((a, b) => b.tg_cap_nhat.localeCompare(a.tg_cap_nhat));
  }
  return sorted;
}
