import type { DipThamHoi } from '../core/types';
import { formatDonViToChucDisplay } from '../core/display-don-vi';

export const DIP_THAM_HOI_SEARCHABLE_KEYS = [
  'ten_dip',
  'mo_ta',
  'thoi_gian_du_kien',
  'ghi_chu',
  'ten_don_vi_to_chuc',
  'ten_phong_ban',
  'trang_thai',
] as const;

export function dipThamHoiSearchRecord(row: DipThamHoi): Record<string, string> {
  return {
    ten_dip: row.ten_dip ?? '',
    mo_ta: row.mo_ta ?? '',
    thoi_gian_du_kien: row.thoi_gian_du_kien ?? '',
    thoi_gian_thuc_te: row.thoi_gian_thuc_te ?? '',
    ghi_chu: row.ghi_chu ?? '',
    ten_don_vi_to_chuc: formatDonViToChucDisplay(row),
    ten_phong_ban: row.ten_phong_ban ?? '',
    trang_thai: row.trang_thai ?? '',
  };
}
