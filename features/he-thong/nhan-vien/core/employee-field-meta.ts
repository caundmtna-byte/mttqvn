import type { DataTypeId } from '@/lib/data-types';
import type { EmployeeFormValues } from './schema';

/**
 * Bản đồ trường form → `DataTypeId` (trỏ vào DATA_TYPE_REGISTRY), dùng chung cho form / table / format read-only.
 *
 * Ghi chú override (không dùng DataField/RhfDataField cho UX đặc thù):
 * - `gioi_tinh`: RadioGroup
 * - `ma_nhan_vien`: uppercase khi gõ
 * - `trang_thai`: Combobox (cần đối chiếu options với giá trị enum)
 */
export const EMPLOYEE_FIELD_DATA_TYPE: Partial<Record<keyof EmployeeFormValues, DataTypeId>> = {
  ma_nhan_vien: 'text',
  ho_ten: 'name',
  email: 'email',
  so_dien_thoai: 'phone',
  chuc_vu_id: 'ref',
  phong_ban_id: 'ref',
  chi_nhanh_id: 'ref',
  gioi_tinh: 'enum',
  trang_thai: 'enum',
  ngay_vao_lam: 'date',
  anh_dai_dien: 'image',
  ngay_sinh: 'date',
  cmnd_cccd: 'text',
  ngay_cap_cccd: 'date',
  noi_cap_cccd: 'text',
  quoc_tich: 'text',
  dan_toc: 'text',
  ton_giao: 'text',
  tinh_thanh: 'text',
  quan_huyen: 'text',
  phuong_xa: 'text',
  dia_chi_cu_the: 'address',
  dia_chi_tam_tru: 'address',
  cap_bac_id: 'ref',
  loai_hop_dong: 'enum',
  ngay_het_han_hd: 'date',
  noi_lam_viec: 'text',
  email_ca_nhan: 'email',
  nguoi_lien_he_khan_cap: 'text',
  sdt_khan_cap: 'phone',
  quan_he_khan_cap: 'enum',
  tinh_trang_hon_nhan: 'enum',
  so_nguoi_phu_thuoc: 'number',
  trinh_do_hoc_van: 'enum',
  chuyen_nganh: 'text',
  truong_hoc: 'text',
  nam_tot_nghiep: 'text',
  chung_chi: 'long_text',
  so_tai_khoan: 'text',
  ten_ngan_hang: 'text',
  chi_nhanh_nh: 'text',
  ma_so_thue_ca_nhan: 'text',
  so_bhxh: 'text',
  so_bhyt: 'text',
  ngay_tham_gia_bh: 'date',
  noi_dang_ky_kcb: 'text',
};

export function getEmployeeFieldDataType(
  field: keyof EmployeeFormValues
): DataTypeId | undefined {
  return EMPLOYEE_FIELD_DATA_TYPE[field];
}
