import type { Employee } from '../core/types';

/**
 * Cột đã có sẵn ô tìm trong dropdown MultiSelect (header bộ lọc kết hợp tick) —
 * không cần áp thêm `columnSearch` cho các cột này.
 */
export const COLUMN_IDS_WITH_MULTISELECT_SEARCH = [
  'ten_phong_ban',
  'ten_bo_phan',
  'ten_chuc_vu',
  'trang_thai',
] as const;

/** Số ô columnSearch đang có nội dung (bỏ cột đã có MultiSelect). */
export function countColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (!q.trim()) continue;
    if ((COLUMN_IDS_WITH_MULTISELECT_SEARCH as readonly string[]).includes(colId)) continue;
    n += 1;
  }
  return n;
}

/**
 * Kiểm tra một nhân viên có khớp toàn bộ ô lọc theo cột (AND, không phân biệt hoa thường).
 * Bỏ qua các khoá thuộc cột đã có MultiSelect.
 */
export function employeeMatchesColumnSearch(
  emp: Employee,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  const skip = COLUMN_IDS_WITH_MULTISELECT_SEARCH as readonly string[];
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (skip.includes(colId)) continue;
    const trimmed = q.trim();
    if (!trimmed) continue;
    const raw = emp[colId as keyof Employee];
    const str = raw == null ? '' : String(raw);
    if (!str.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}
