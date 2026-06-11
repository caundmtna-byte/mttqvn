import type { DipThamHoi } from '../core/types';
import { formatDonViToChucDisplay } from '../core/display-don-vi';
import { dipThamHoiSearchRecord } from './search-keys';

export function countDipThamHoiColumnSearchActive(columnSearch: Record<string, string>): number {
  return Object.values(columnSearch ?? {}).filter((v) => v?.trim()).length;
}

export function dipThamHoiMatchesColumnSearch(row: DipThamHoi, columnSearch: Record<string, string>): boolean {
  const cs = columnSearch ?? {};
  const keys = Object.keys(cs);
  if (keys.length === 0) return true;
  const record = dipThamHoiSearchRecord(row);
  for (const key of keys) {
    const needle = cs[key]?.trim().toLowerCase();
    if (!needle) continue;
    let haystack = '';
    switch (key) {
      case 'ten_dip':
        haystack = row.ten_dip ?? '';
        break;
      case 'thoi_gian_du_kien':
        haystack = row.thoi_gian_du_kien ?? '';
        break;
      case 'thoi_gian_thuc_te':
        haystack = row.thoi_gian_thuc_te ?? '';
        break;
      case 'don_vi_to_chuc':
        haystack = formatDonViToChucDisplay(row);
        break;
      case 'phong_ban_tham_muu':
        haystack = row.ten_phong_ban ?? '';
        break;
      case 'trang_thai':
        haystack = row.trang_thai ?? '';
        break;
      case 'mo_ta':
        haystack = row.mo_ta ?? '';
        break;
      default:
        haystack = record[key] ?? '';
    }
    if (!haystack.toLowerCase().includes(needle)) return false;
  }
  return true;
}
