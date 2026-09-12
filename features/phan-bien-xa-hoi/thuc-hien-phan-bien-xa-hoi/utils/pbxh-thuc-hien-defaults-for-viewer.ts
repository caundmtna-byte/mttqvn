import type { ThucHienPhanBienFormInput } from '../core/schema';

export interface PbxhThucHienDefaultsInput {
  /** Giá trị nền từ `thucHienPhanBienToFormInput(null)`. */
  base: ThucHienPhanBienFormInput;
  /** Người đang thao tác bị giới hạn phạm vi Xã phường (`isPbxhScopedToXaPhuong`). */
  scopedToXa: boolean;
  /** `var_nhan_vien.don_vi_id` của người đang thao tác. */
  viewerDonViId?: string | null;
  /** `var_nhan_vien.id_phong_ban` của người đang thao tác. */
  viewerPhongBanId?: string | null;
  /** Id phòng ban đang hiện trên combobox — id ngoài danh sách này thì bỏ qua. */
  phongBanIds: readonly string[];
}

/**
 * Giá trị mặc định khi **tạo mới** một đợt kiểm tra / giám sát / phản biện.
 *
 * Tài khoản cấp xã nhập việc của chính xã mình, nhưng `cap_thuc_hien` vốn mặc
 * định `'Cấp tỉnh'` cho mọi người — quên đổi là ghi sai cấp, mà đây lại là cột
 * lọc và là chiều thống kê, nên sai một dòng là lệch cả báo cáo.
 * Chỉ là **mặc định, không khóa**.
 *
 * Lưu ý: `cap_thuc_hien` dùng chuỗi `'Cấp xã'` (`CAP_THUC_HIEN_VALUES`), khác
 * với `cap_quan_ly` của chức vụ là `'Xã phường'` — đừng lẫn hai họ giá trị.
 */
export function buildPbxhThucHienDefaults(
  input: PbxhThucHienDefaultsInput,
): ThucHienPhanBienFormInput {
  const defaults: ThucHienPhanBienFormInput = { ...input.base };
  if (!input.scopedToXa) return defaults;

  defaults.cap_thuc_hien = 'Cấp xã';

  const donVi = input.viewerDonViId != null ? String(input.viewerDonViId).trim() : '';
  if (donVi) defaults.don_vi_thuc_hien_id = donVi;

  const phongBan = input.viewerPhongBanId != null ? String(input.viewerPhongBanId).trim() : '';
  if (phongBan && input.phongBanIds.includes(phongBan)) {
    defaults.phong_ban_tham_muu_id = phongBan;
  }

  return defaults;
}
