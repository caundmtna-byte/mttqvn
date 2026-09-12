import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { SupabaseAppError } from './errors';
import { mapSupabaseErrorToVietnamese } from './error-messages';

/**
 * Ràng buộc DB → ô nhập tương ứng trên form.
 *
 * Lỗi trùng dữ liệu nên hiện **chữ đỏ ngay dưới ô** chứ không phải toast bay ở góc:
 * người dùng biết chính xác phải sửa ô nào. Toàn repo trước đây chỉ 2 form làm vậy,
 * 19 ràng buộc UNIQUE còn lại đều đổ ra toast.
 */
const CONSTRAINT_TO_FIELD: Record<string, string> = {
  uq_var_phong_ban_ten_lower: 'ten_phong_ban',
  uq_var_phong_ban_ma: 'ma_phong_ban',
  uq_var_chuc_vu_ten_lower: 'ten_chuc_vu',
  uq_var_ssn_tinh_thanh_ten_lower: 'ten',
  uq_var_ssn_xa_phuong_ten_lower_per_tinh: 'ten',
  uq_kho_nhap_xuat_kho_so_phieu: 'so_phieu',
  uq_kho_danh_muc_hang_hoa_ten_lower: 'ten_danh_muc',
  uq_kho_danh_sach_hang_hoa_dm_ten_lower: 'ten_hang_hoa',
  uq_bai_viet_danh_sach_link_lower: 'link',
  uq_bai_viet_thiet_lap_the_loai_ten_lower: 'ten_the_loai',
  uq_mttq_thiet_lap_loai_ten_lower: 'ten',
  uq_pbxh_thiet_lap_loai_ten_lower: 'ten',
  idx_dttg_dip_tham_hoi_ten_lower: 'ten_dip',
  uq_luong_thiet_lap_ngach_luong_ten_lower: 'ten',
  uq_luong_thiet_lap_ngach_luong_ma_lower: 'ma',
  uq_mttq_uy_vien_uy_ban_nhiem_ky_can_bo: 'can_bo_id',
  uq_mttq_uy_vien_uy_ban_nhiem_ky_ma_uv: 'ma_uv',
};

/** Lỗi này có ô nhập tương ứng để gắn thông báo không? */
export function isConstraintFieldError(err: unknown): boolean {
  return err instanceof SupabaseAppError && !!err.constraint && !!CONSTRAINT_TO_FIELD[err.constraint];
}

/**
 * Gắn lỗi ràng buộc DB vào đúng ô nhập. Trả `true` nếu đã xử lý — khi đó **không**
 * toast nữa (xem mẫu `use-bai-viet-danh-sach.ts`: hook return sớm, form lo hiển thị).
 */
export function applyConstraintErrorToForm<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!(err instanceof SupabaseAppError) || !err.constraint) return false;
  const field = CONSTRAINT_TO_FIELD[err.constraint];
  if (!field) return false;
  setError(field as Path<T>, {
    type: 'manual',
    message: mapSupabaseErrorToVietnamese({
      code: err.code,
      constraint: err.constraint,
      message: err.message,
    }),
  });
  return true;
}

export const __CONSTRAINT_TO_FIELD = CONSTRAINT_TO_FIELD;
