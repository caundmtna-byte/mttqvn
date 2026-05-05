import type { Employee } from '../core/types';

/**
 * Cột đã có ô tìm trong dropdown MultiSelect (lọc danh sách tick) — không dùng thêm `columnSearch` cho cùng cột
 * (một ô giao diện thống nhất).
 */
export const COLUMN_IDS_WITH_MULTISELECT_SEARCH = [
  'ten_phong_ban',
  'ten_chuc_vu',
  'trang_thai',
] as const;

/** Map id cột UI → field trên Employee (cột cũ `lien_he` = SĐT). */
export function columnIdToEmployeeKey(colId: string): keyof Employee {
  if (colId === 'lien_he') return 'so_dien_thoai';
  return colId as keyof Employee;
}

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
 * Kiểm tra một nhân viên có khớp tất cả ô lọc theo cột (AND, không phân biệt hoa thường).
 * Bỏ qua các khóa thuộc cột đã có MultiSelect (state cũ không còn UI).
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
    const key = columnIdToEmployeeKey(colId);
    const raw = emp[key];
    const str = raw == null ? '' : String(raw);
    if (!str.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}
