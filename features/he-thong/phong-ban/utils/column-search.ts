import type { Department } from '../core/types';

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
      return item.ma_phong_ban;
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
  if (!columnSearch) return 0;
  const skip = DEPARTMENT_COLUMN_IDS_WITH_MULTISELECT as readonly string[];
  let n = 0;
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (!q.trim()) continue;
    if (skip.includes(colId)) continue;
    n += 1;
  }
  return n;
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
  if (!columnSearch) return true;
  const skip = DEPARTMENT_COLUMN_IDS_WITH_MULTISELECT as readonly string[];
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (skip.includes(colId)) continue;
    const trimmed = q.trim();
    if (!trimmed) continue;
    const str = columnIdToValue(colId, item, parentName);
    if (!str.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}
