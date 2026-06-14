import type { Department } from '../core/types';
import { countActiveColumnSearchFilters, rowMatchesColumnSearch } from '@/lib/column-search';

/** Cột đã có MultiSelect ở header — không áp dụng thêm `columnSearch` cho cùng id cột. */
export const DEPARTMENT_COLUMN_IDS_WITH_MULTISELECT = ['trang_thai', 'ten_phong_ban'] as const;

function columnIdToValue(
  colId: string,
  item: Department,
  parentName: string,
): string {
  switch (colId) {
    case 'thu_tu':
      return String(item.thu_tu);
    case 'ma_phong_ban':
    case 'ten_phong_ban':
      return item.ten_phong_ban;
    case 'mo_ta':
      return item.mo_ta ?? '';
    case 'cap_do':
      return String(item.cap_do);
    case 'ten_phong_cha':
      return parentName;
    case 'tg_cap_nhat':
      return item.tg_cap_nhat ?? '';
    default:
      return '';
  }
}

export function countDepartmentColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
): number {
  return countActiveColumnSearchFilters(columnSearch, DEPARTMENT_COLUMN_IDS_WITH_MULTISELECT);
}

/**
 * AND theo từng ô columnSearch (không phân biệt hoa thường).
 * `parentName` = tên phòng cha hiển thị (cột ten_phong_cha).
 */
export function departmentMatchesColumnSearch(
  item: Department,
  columnSearch: Record<string, string> | undefined,
  parentName: string,
): boolean {
  return rowMatchesColumnSearch(columnSearch, DEPARTMENT_COLUMN_IDS_WITH_MULTISELECT, (colId) =>
    columnIdToValue(colId, item, parentName),
  );
}
