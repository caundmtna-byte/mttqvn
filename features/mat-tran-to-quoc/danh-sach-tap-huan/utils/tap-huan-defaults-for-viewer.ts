import type { MttqTapHuanFormValues } from '../core/schema';

export interface TapHuanDefaultsForViewerInput {
  /** Giá trị nền (hằng số `DEFAULT_VALUES` của form). */
  base: MttqTapHuanFormValues;
  /** Người đang thao tác có chức vụ cấp **Xã phường**. */
  isXaPhuongViewer: boolean;
  /** `var_nhan_vien.don_vi_id` của người đang thao tác. */
  viewerDonViId?: string | null;
}

/**
 * Giá trị mặc định khi **mở lớp tập huấn mới**.
 *
 * `cap_tap_huan` vốn mặc định `'Cấp tỉnh'` cho mọi người; tài khoản cấp xã quên
 * đổi là lớp của xã bị ghi thành lớp cấp tỉnh, và ô đơn vị (chỉ hiện khi Cấp xã)
 * cũng không được điền. Chỉ là **mặc định, không khóa**.
 *
 * Lưu ý: `cap_tap_huan` dùng chuỗi `'Cấp xã'` (`MTTQ_TAP_HUAN_CAP`), khác với
 * `cap_quan_ly` của chức vụ là `'Xã phường'`.
 */
export function buildTapHuanDefaultsForViewer(
  input: TapHuanDefaultsForViewerInput,
): MttqTapHuanFormValues {
  const defaults: MttqTapHuanFormValues = { ...input.base, chi_tiet: [] };
  if (!input.isXaPhuongViewer) return defaults;

  const donVi = input.viewerDonViId != null ? String(input.viewerDonViId).trim() : '';
  if (!donVi) return defaults;

  defaults.cap_tap_huan = 'Cấp xã';
  defaults.don_vi_id = donVi;
  return defaults;
}
