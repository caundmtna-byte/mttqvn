import { isCapQuanLy } from '../../chuc-vu/utils/cap-quan-ly';
import type { Employee } from '../core/types';
import type { EmployeeFormValues } from '../core/schema';

export interface EmployeeViewerDefaults {
  /** Người đang thao tác có chức vụ cấp **Xã phường**. */
  isXaPhuongViewer: boolean;
  /** `var_nhan_vien.don_vi_id` của người đang thao tác. */
  viewerDonViId?: string | null;
  /** `var_nhan_vien.id_phong_ban` của người đang thao tác. */
  viewerPhongBanId?: string | null;
  /** Id phòng ban đang hiện trên combobox (phòng gốc, đang hoạt động). */
  selectablePhongBanIds?: readonly string[];
}

/**
 * Giá trị mặc định cho form tạo mới nhân viên.
 *
 * Truyền `viewerDefaults` khi người đang thao tác là cấp Xã phường: hồ sơ họ lập
 * gần như luôn thuộc chính xã mình, nên điền sẵn phòng ban + cấp quản lý + đơn vị.
 * Chỉ là **mặc định, không khóa**. `id_bo_phan` cố ý để trống — không suy diễn bộ phận con.
 */
export function getDefaultEmployeeFormValues(
  viewerDefaults?: EmployeeViewerDefaults,
): EmployeeFormValues {
  const values: EmployeeFormValues = {
    ten_tai_khoan: '',
    ho_va_ten: '',
    hinh_anh: null,
    id_phong_ban: '',
    id_bo_phan: '',
    id_chuc_vu: '',
    cap_quan_ly: [],
    to_chuc_ids: [],
    don_vi_id: '',
    trang_thai: 'Hoạt động',
  };
  if (!viewerDefaults?.isXaPhuongViewer) return values;

  values.cap_quan_ly = ['Xã phường'];

  const donVi =
    viewerDefaults.viewerDonViId != null ? String(viewerDefaults.viewerDonViId).trim() : '';
  if (donVi) values.don_vi_id = donVi;

  const phongBan =
    viewerDefaults.viewerPhongBanId != null ? String(viewerDefaults.viewerPhongBanId).trim() : '';
  if (phongBan && (viewerDefaults.selectablePhongBanIds ?? []).includes(phongBan)) {
    values.id_phong_ban = phongBan;
  }

  return values;
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
    cap_quan_ly: Array.isArray(emp.cap_quan_ly) ? emp.cap_quan_ly.filter(isCapQuanLy) : [],
    to_chuc_ids: Array.isArray(emp.to_chuc_ids) ? emp.to_chuc_ids : [],
    don_vi_id: fkToFormString(emp.don_vi_id),
    trang_thai: emp.trang_thai,
  };
}
