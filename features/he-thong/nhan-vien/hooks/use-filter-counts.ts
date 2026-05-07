import { useMemo } from 'react';
import type { Employee, EmployeeFilters } from '../core/types';
import { matchesSearchTerm } from '@/lib/searchUtils';
import { employeeMatchesColumnSearch } from '../utils/column-search';

const SEARCHABLE_KEYS = [
  'ten_tai_khoan',
  'ho_va_ten',
  'ten_phong_ban',
  'ten_bo_phan',
  'ten_chuc_vu',
  'trang_thai',
];

export interface FilterCounts {
  /** Số lượng nhân viên thuộc mỗi phòng ban (sau khi bỏ chính filter phòng ban hiện tại). */
  deptCounts: Record<string, number>;
  /** Số lượng nhân viên thuộc mỗi bộ phận (phòng ban con). */
  unitCounts: Record<string, number>;
  /** Số lượng nhân viên thuộc mỗi chức vụ. */
  posCounts: Record<string, number>;
  /** Số lượng nhân viên theo trạng thái (`Hoạt động` | `Khóa`). */
  statusCounts: Record<string, number>;
}

/**
 * Đếm số nhân viên thoả mỗi tuỳ chọn trong các bộ lọc multi-select. Mỗi nhóm
 * counts loại trừ chính filter đó (exclude-self) để hiển thị "nếu chọn thêm
 * sẽ được bao nhiêu kết quả".
 */
export function useFilterCounts(
  employees: Employee[],
  searchTerm: string,
  filters: EmployeeFilters,
): FilterCounts {
  return useMemo(() => {
    const passesText = (e: Employee) => {
      if (!matchesSearchTerm(e as unknown as Record<string, unknown>, searchTerm, SEARCHABLE_KEYS)) return false;
      if (!employeeMatchesColumnSearch(e, filters.columnSearch)) return false;
      return true;
    };
    const passesStatus = (e: Employee) =>
      filters.trang_thai.length === 0 || filters.trang_thai.includes(e.trang_thai);
    const passesDept = (e: Employee) =>
      filters.id_phong_ban.length === 0 ||
      (e.id_phong_ban != null && filters.id_phong_ban.includes(e.id_phong_ban));
    const passesPos = (e: Employee) =>
      filters.id_chuc_vu.length === 0 ||
      (e.id_chuc_vu != null && filters.id_chuc_vu.includes(e.id_chuc_vu));

    const deptCounts: Record<string, number> = {};
    const unitCounts: Record<string, number> = {};
    const posCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    for (const e of employees) {
      if (!passesText(e)) continue;
      if (passesStatus(e) && passesPos(e)) {
        if (e.id_phong_ban) deptCounts[e.id_phong_ban] = (deptCounts[e.id_phong_ban] ?? 0) + 1;
        if (e.id_bo_phan) unitCounts[e.id_bo_phan] = (unitCounts[e.id_bo_phan] ?? 0) + 1;
      }
      if (passesStatus(e) && passesDept(e) && e.id_chuc_vu) {
        posCounts[e.id_chuc_vu] = (posCounts[e.id_chuc_vu] ?? 0) + 1;
      }
      if (passesDept(e) && passesPos(e)) {
        statusCounts[e.trang_thai] = (statusCounts[e.trang_thai] ?? 0) + 1;
      }
    }

    return { deptCounts, unitCounts, posCounts, statusCounts };
  }, [employees, searchTerm, filters]);
}
