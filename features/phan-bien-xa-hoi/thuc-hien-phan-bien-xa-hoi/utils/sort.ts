import { getLanguage } from '@/lib/utils';
import type { ThucHienPhanBien } from '../core/types';
import type { SortState } from '@/store/createGenericStore';

export function sortThucHienPhanBienList(
  rows: ThucHienPhanBien[],
  sort: SortState,
): ThucHienPhanBien[] {
  const sorted = [...rows];
  if (sort.column && sort.direction) {
    const key = sort.column as keyof ThucHienPhanBien;
    sorted.sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      const cmp =
        typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal ?? '').localeCompare(String(bVal ?? ''), getLanguage());
      return sort.direction === 'desc' ? -cmp : cmp;
    });
  } else {
    sorted.sort((a, b) => b.tg_cap_nhat.localeCompare(a.tg_cap_nhat));
  }
  return sorted;
}
