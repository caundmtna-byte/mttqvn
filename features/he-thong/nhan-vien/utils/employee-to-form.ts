import type { Employee } from '../core/types';
import type { EmployeeFormValues } from '../core/schema';

/** Giá trị mặc định cho form tạo mới nhân viên. */
export function getDefaultEmployeeFormValues(): EmployeeFormValues {
  return {
    ten_tai_khoan: '',
    ho_va_ten: '',
    hinh_anh: null,
    id_phong_ban: '',
    id_bo_phan: '',
    id_chuc_vu: '',
    don_vi_id: '',
    trang_thai: 'Hoạt động',
  };
}

/** Map `Employee` → giá trị form (khi mở chế độ chỉnh sửa). */
function fkToFormString(v: string | null | undefined): string {
  if (v == null || v === '') return '';
  return String(v);
}

export function employeeToFormValues(emp: Employee): EmployeeFormValues {
  return {
    ten_tai_khoan: emp.ten_tai_khoan,
    ho_va_ten: emp.ho_va_ten,
    hinh_anh: emp.hinh_anh,
    id_phong_ban: fkToFormString(emp.id_phong_ban),
    id_bo_phan: fkToFormString(emp.id_bo_phan),
    id_chuc_vu: fkToFormString(emp.id_chuc_vu),
    don_vi_id: fkToFormString(emp.don_vi_id),
    trang_thai: emp.trang_thai,
  };
}
