import { formatDonViThamHoiDisplay } from '../core/display-don-vi';
import type { ThamHoiCaNhan } from '../core/types';
import { formatThoiGianDuKienDisplay } from './thoi-gian-du-kien';

export function countThamHoiCaNhanColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

export function thamHoiCaNhanMatchesColumnSearch(
  row: ThamHoiCaNhan,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    let haystack = '';
    switch (colId) {
      case 'ho_va_ten':
        haystack = row.ho_va_ten ?? '';
        break;
      case 'doi_tuong':
        haystack = row.doi_tuong ?? '';
        break;
      case 'chuc_vu_vi_tri':
        haystack = row.chuc_vu_vi_tri ?? '';
        break;
      case 'dip_tham_hoi':
        haystack = row.dip_tham_hoi ?? '';
        break;
      case 'thoi_gian_du_kien':
        haystack = formatThoiGianDuKienDisplay(row.thoi_gian_du_kien);
        break;
      case 'don_vi_tham_hoi':
        haystack = formatDonViThamHoiDisplay(row);
        break;
      case 'ten_phong_ban':
        haystack = row.ten_phong_ban ?? '';
        break;
      case 'qua_tang':
        haystack = row.qua_tang ?? '';
        break;
      case 'ten_xa_phuong':
        haystack = row.ten_xa_phuong ?? '';
        break;
      case 'trang_thai':
        haystack = row.trang_thai ?? '';
        break;
      case 'ket_qua_ghi_chu':
        haystack = row.ket_qua_ghi_chu ?? '';
        break;
      case 'link_ket_qua':
        haystack = row.link_ket_qua ?? '';
        break;
      case 'tg_cap_nhat':
        haystack = row.tg_cap_nhat ?? '';
        break;
      default:
        haystack = '';
    }
    if (!haystack.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}
