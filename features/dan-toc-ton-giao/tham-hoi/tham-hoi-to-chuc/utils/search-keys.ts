import { formatDonViThamHoiDisplay } from '../core/display-don-vi';
import type { ThamHoiToChuc } from '../core/types';

/** Cột dùng cho ô tìm kiếm tổng — subset dữ liệu list. */
export const THAM_HOI_TO_CHUC_SEARCHABLE_KEYS = [
  'ten_co_so',
  'loai_hinh',
  'dip_tham_hoi',
  'thoi_gian_du_kien',
  'ten_don_vi_tham_hoi',
  'noi_dung_tham_hoi',
  'thanh_phan_doan',
  'qua_tang',
  'ket_qua_thuc_hien',
] as const;

/** Map row → searchable string values (computed fields). */
export function thamHoiToChucSearchRecord(row: ThamHoiToChuc): Record<string, string> {
  return {
    ten_co_so: row.ten_co_so ?? '',
    loai_hinh: row.loai_hinh ?? '',
    dip_tham_hoi: row.dip_tham_hoi ?? '',
    thoi_gian_du_kien: row.thoi_gian_du_kien ?? '',
    ten_don_vi_tham_hoi: formatDonViThamHoiDisplay(row),
    noi_dung_tham_hoi: row.noi_dung_tham_hoi ?? '',
    thanh_phan_doan: row.thanh_phan_doan ?? '',
    qua_tang: row.qua_tang ?? '',
    ket_qua_thuc_hien: row.ket_qua_thuc_hien ?? '',
  };
}
