
import { useMemo } from 'react';
import type { Employee, EmployeeFilters } from '../core/types';
import { employeeMatchesColumnSearch } from '../utils/column-search';

/**
 * Tính count cho từng giá trị filter theo chiến lược "exclude-self":
 * - Khi đếm cho filter A, áp dụng TẤT CẢ filter khác NGOẠI TRỪ A.
 * - Nhờ vậy, khi user đã chọn "Phòng Kỹ thuật", các phòng ban khác
 *   vẫn hiện count chính xác (không bị = 0).
 */
export function useFilterCounts(
  employees: Employee[],
  searchTerm: string,
  filters: EmployeeFilters,
) {
  return useMemo(() => {
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = (emp: Employee) =>
      !searchTerm ||
      emp.ho_ten.toLowerCase().includes(searchLower) ||
      emp.ma_nhan_vien.toLowerCase().includes(searchLower) ||
      emp.email.toLowerCase().includes(searchLower) ||
      emp.so_dien_thoai.includes(searchLower) ||
      (emp.ten_chuc_vu && emp.ten_chuc_vu.toLowerCase().includes(searchLower)) ||
      (emp.ten_phong_ban && emp.ten_phong_ban.toLowerCase().includes(searchLower));

    const matchesDept = (emp: Employee) =>
      filters.phong_ban_id.length === 0 ||
      (emp.phong_ban_id != null && filters.phong_ban_id.includes(emp.phong_ban_id));

    const matchesPosition = (emp: Employee) =>
      filters.position.length === 0 ||
      (emp.chuc_vu_id != null && filters.position.includes(emp.chuc_vu_id));

    const matchesStatus = (emp: Employee) =>
      filters.trang_thai.length === 0 ||
      filters.trang_thai.includes(String(emp.trang_thai));

    // ── Đếm cho Phòng ban (exclude dept filter) ──
    const deptCounts: Record<string, number> = {};
    // ── Đếm cho Chức vụ (exclude position filter) ──
    const posCounts: Record<string, number> = {};
    // ── Đếm cho Trạng thái (exclude status filter) ──
    const statusCounts: Record<string, number> = {};

    for (const emp of employees) {
      if (!matchesSearch(emp)) continue;
      if (!employeeMatchesColumnSearch(emp, filters.columnSearch)) continue;

      const passDept = matchesDept(emp);
      const passPos = matchesPosition(emp);
      const passStatus = matchesStatus(emp);

      // Dept count: apply search + position + status (exclude dept)
      if (passPos && passStatus && emp.phong_ban_id) {
        deptCounts[emp.phong_ban_id] = (deptCounts[emp.phong_ban_id] || 0) + 1;
      }

      // Position count: apply search + dept + status (exclude position)
      if (passDept && passStatus && emp.chuc_vu_id) {
        posCounts[emp.chuc_vu_id] = (posCounts[emp.chuc_vu_id] || 0) + 1;
      }

      // Status count: apply search + dept + position (exclude status)
      if (passDept && passPos) {
        const key = String(emp.trang_thai);
        statusCounts[key] = (statusCounts[key] || 0) + 1;
      }
    }

    return { deptCounts, posCounts, statusCounts };
  }, [employees, searchTerm, filters]);
}
