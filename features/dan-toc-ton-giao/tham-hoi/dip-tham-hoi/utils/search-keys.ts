import type { DipThamHoi } from '../core/types';
import { formatDonViToChucDisplay } from '../core/display-don-vi';

export const DIP_THAM_HOI_SEARCHABLE_KEYS = [
  'ten_dip',
  'mo_ta',
  'thoi_gian_du_kien',
  'thoi_gian_thuc_te',
  'so_luong_du_kien_tong',
  'so_luong_to_chuc_du_kien',
  'so_luong_ca_nhan_du_kien',
  'so_luong_thuc_te_tong',
  'ghi_chu',
  'ten_don_vi_to_chuc',
  'ten_phong_ban',
  'trang_thai',
  'tg_cap_nhat',
] as const;

export function dipThamHoiSearchRecord(row: DipThamHoi): Record<string, string | number> {
  return {
    ten_dip: row.ten_dip ?? '',
    mo_ta: row.mo_ta ?? '',
    thoi_gian_du_kien: row.thoi_gian_du_kien ?? '',
    thoi_gian_thuc_te: row.thoi_gian_thuc_te ?? '',
    ghi_chu: row.ghi_chu ?? '',
    ten_don_vi_to_chuc: formatDonViToChucDisplay(row),
    ten_phong_ban: row.ten_phong_ban ?? '',
    trang_thai: row.trang_thai ?? '',
    so_luong_du_kien_tong: row.so_luong_du_kien_tong,
    so_luong_to_chuc_du_kien: row.so_luong_to_chuc_du_kien,
    so_luong_ca_nhan_du_kien: row.so_luong_ca_nhan_du_kien,
    so_luong_thuc_te_tong: row.so_luong_thuc_te_tong,
    tg_cap_nhat: row.tg_cap_nhat ?? '',
  };
}
