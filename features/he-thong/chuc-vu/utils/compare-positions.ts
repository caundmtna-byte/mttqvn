import { getLanguage } from '../../../../lib/utils';
import type { SortState } from '../../../../store/createGenericStore';
import type { Position } from '../core/types';

export function positionSortKey(columnId: string): keyof Position {
  return columnId as keyof Position;
}

/** Sắp xếp chức vụ trong cùng một nhóm — khớp logic `sortedPositions` ở trang list. */
export function comparePositions(a: Position, b: Position, sort: SortState): number {
  if (sort.column && sort.direction) {
    const key = positionSortKey(sort.column);
    const aVal = a[key] ?? '';
    const bVal = b[key] ?? '';
    const cmp =
      typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal), getLanguage());
    return sort.direction === 'desc' ? -cmp : cmp;
  }
  return a.thu_tu - b.thu_tu || a.ten_chuc_vu.localeCompare(b.ten_chuc_vu, getLanguage());
}
