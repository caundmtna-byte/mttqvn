import { formatDonViThamHoiDisplay } from '../core/display-don-vi';
import type { ThamHoiCaNhan } from '../core/types';
import { formatThoiGianDuKienDisplay } from './thoi-gian-du-kien';

/** Cột dùng cho ô tìm kiếm tổng — subset dữ liệu list. */
export const THAM_HOI_CA_NHAN_SEARCHABLE_KEYS = [
  'ho_va_ten',
  'doi_tuong',
  'chuc_vu_vi_tri',
  'dip_tham_hoi',
  'thoi_gian_du_kien',
  'ten_don_vi_tham_hoi',
  'ten_phong_ban',
  'qua_tang',
  'ten_xa_phuong',
  'ket_qua_ghi_chu',
] as const;

/** Map row → searchable string values (computed fields). */
export function thamHoiCaNhanSearchRecord(row: ThamHoiCaNhan): Record<string, string> {
  return {
    ho_va_ten: row.ho_va_ten ?? '',
    doi_tuong: row.doi_tuong ?? '',
    chuc_vu_vi_tri: row.chuc_vu_vi_tri ?? '',
    dip_tham_hoi: row.dip_tham_hoi ?? '',
    thoi_gian_du_kien: formatThoiGianDuKienDisplay(row.thoi_gian_du_kien),
    ten_don_vi_tham_hoi: formatDonViThamHoiDisplay(row),
    ten_phong_ban: row.ten_phong_ban ?? '',
    qua_tang: row.qua_tang ?? '',
    ten_xa_phuong: row.ten_xa_phuong ?? '',
    ket_qua_ghi_chu: row.ket_qua_ghi_chu ?? '',
  };
}
