import { MTTQ_CAN_BO_FORM_DEFAULT_VALUES } from '../core/default-form-values';
import type { MttqCanBoFormValues } from '../core/schema';
import { rootPhongBanIdForForm } from './phong-ban-form';

export interface CanBoDefaultsForViewerInput {
  /** Người đang thao tác có chức vụ cấp **Xã phường**. */
  isXaPhuongViewer: boolean;
  /** `var_nhan_vien.don_vi_id` của người đang thao tác. */
  viewerDonViId?: string | null;
  /** `var_nhan_vien.id_phong_ban` của người đang thao tác (có thể là bộ phận con). */
  viewerPhongBanId?: string | null;
  /** Cây phòng ban — để quy bộ phận con về phòng gốc. */
  departments: readonly { id: string; cha_id: string | null }[];
  /** Id phòng ban đang hiện trên combobox (phòng gốc, đang hoạt động). */
  selectablePhongBanIds: readonly string[];
}

/**
 * Giá trị mặc định khi **tạo mới** cán bộ.
 *
 * Tài khoản cấp Xã phường nhập cán bộ của chính xã mình là chuyện thường ngày,
 * nên điền sẵn phòng ban + cấp quản lý + đơn vị theo hồ sơ người đang thao tác.
 * Chỉ là **mặc định, không khóa** — vẫn đổi được sang giá trị khác.
 */
export function buildCanBoDefaultsForViewer(
  input: CanBoDefaultsForViewerInput,
): MttqCanBoFormValues {
  const defaults: MttqCanBoFormValues = {
    ...MTTQ_CAN_BO_FORM_DEFAULT_VALUES,
    to_chuc_ids: [],
    cap_quan_ly: [],
  };
  if (!input.isXaPhuongViewer) return defaults;

  defaults.cap_quan_ly = ['Xã phường'];

  const donVi = input.viewerDonViId != null ? String(input.viewerDonViId).trim() : '';
  if (donVi) defaults.don_vi_id = donVi;

  const phongBan = rootPhongBanIdForForm(input.viewerPhongBanId, input.departments);
  if (phongBan && input.selectablePhongBanIds.includes(phongBan)) {
    defaults.id_phong_ban = phongBan;
  }

  return defaults;
}
