import type { Employee } from '../core/types';
import type { Position } from '../../chuc-vu/core/types';
import { normalizeCapQuanLyInput } from '../../chuc-vu/utils/cap-quan-ly';

type PositionChucVuSlice = Pick<Position, 'id' | 'ten_chuc_vu' | 'cap_quan_ly'>;

/**
 * Gắn `cap_quan_ly` (và tên chức vụ nếu thiếu) từ master Chức vụ — nguồn đúng theo DB,
 * tránh list/detail thiếu field khi cache nhân viên cũ hoặc lệch kiểu id.
 */
export function mergeEmployeeChucVuFromPositions(
  emp: Employee,
  positions: readonly PositionChucVuSlice[],
): Employee {
  if (emp.id_chuc_vu == null || String(emp.id_chuc_vu).trim() === '') {
    return emp;
  }
  const want = String(emp.id_chuc_vu).trim();
  const p = positions.find((x) => String(x.id).trim() === want);
  if (!p) return emp;
  const cap = normalizeCapQuanLyInput(p.cap_quan_ly as string | null | undefined);
  const tenCv = (p.ten_chuc_vu ?? '').trim();
  return {
    ...emp,
    cap_quan_ly: cap ?? null,
    ...(emp.ten_chuc_vu == null || String(emp.ten_chuc_vu).trim() === ''
      ? tenCv
        ? { ten_chuc_vu: tenCv }
        : {}
      : {}),
  };
}
