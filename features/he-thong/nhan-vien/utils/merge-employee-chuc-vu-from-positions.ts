import type { Employee } from '../core/types';
import type { Position } from '../../chuc-vu/core/types';

type PositionChucVuSlice = Pick<Position, 'id' | 'ten_chuc_vu'>;

/**
 * Gắn tên chức vụ nếu thiếu từ master Chức vụ.
 * `cap_quan_ly` giờ nằm trực tiếp trên `var_nhan_vien` — không cần enrich từ position.
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
  const tenCv = (p.ten_chuc_vu ?? '').trim();
  const needsPatch = (emp.ten_chuc_vu == null || String(emp.ten_chuc_vu).trim() === '') && !!tenCv;
  if (!needsPatch) return emp;
  return { ...emp, ten_chuc_vu: tenCv };
}
