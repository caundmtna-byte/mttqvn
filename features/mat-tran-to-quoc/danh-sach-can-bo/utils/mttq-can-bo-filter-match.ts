import { matchesSearchTerm } from '@/lib/searchUtils';
import {
  CHIP_DANG_VIEN_NO,
  CHIP_DANG_VIEN_YES,
  CHIP_FILTER_NULL,
  CHIP_TRANG_THAI_NULL,
} from '../core/constants';
import type { MttqCanBoFilters, MttqCanBoRow } from '../core/types';
import { MTTQ_CAN_BO_SEARCHABLE_KEYS } from './search-keys';
import { mttqCanBoMatchesColumnSearch } from './column-search';
import { mttqCanBoCapQuanLyChipKeyFromRow } from './cap-quan-ly-chip-key';

export type MttqCanBoChipFilterKey = Exclude<keyof MttqCanBoFilters, 'columnSearch'>;

export function omitChipFilter(f: MttqCanBoFilters, key: MttqCanBoChipFilterKey): MttqCanBoFilters {
  return { ...f, [key]: [] };
}

/** Khớp ô tìm tổng + columnSearch + toàn bộ chip (dùng cho list và đếm exclude-self). */
export function mttqCanBoMatchesAllFilters(
  item: MttqCanBoRow,
  searchTerm: string,
  f: MttqCanBoFilters,
): boolean {
  if (
    !matchesSearchTerm(item as unknown as Record<string, unknown>, searchTerm, MTTQ_CAN_BO_SEARCHABLE_KEYS)
  ) {
    return false;
  }
  if (!mttqCanBoMatchesColumnSearch(item, f)) return false;

  const ttKey = item.trang_thai_id ?? CHIP_TRANG_THAI_NULL;
  if (f.trang_thai_id.length > 0 && !f.trang_thai_id.includes(ttKey)) return false;

  if (f.gioi_tinh.length > 0 && !f.gioi_tinh.includes(item.gioi_tinh)) return false;

  const toKey = item.to_chuc_id ?? CHIP_FILTER_NULL;
  if (f.to_chuc_id.length > 0 && !f.to_chuc_id.includes(toKey)) return false;

  const pbKey = item.phong_ban_id ?? CHIP_FILTER_NULL;
  if (f.phong_ban_id.length > 0 && !f.phong_ban_id.includes(pbKey)) return false;

  const cvKey = item.chuc_vu_id ?? CHIP_FILTER_NULL;
  if (f.chuc_vu_id.length > 0 && !f.chuc_vu_id.includes(cvKey)) return false;

  const capKey = mttqCanBoCapQuanLyChipKeyFromRow(item);
  if (f.chuc_vu_cap_quan_ly.length > 0 && !f.chuc_vu_cap_quan_ly.includes(capKey)) return false;

  const xaKey = item.don_vi_id ?? CHIP_FILTER_NULL;
  if (f.don_vi_id.length > 0 && !f.don_vi_id.includes(xaKey)) return false;

  const dtKey = item.dan_toc_id ?? CHIP_FILTER_NULL;
  if (f.dan_toc_id.length > 0 && !f.dan_toc_id.includes(dtKey)) return false;

  const tdKey = item.trinh_do_id ?? CHIP_FILTER_NULL;
  if (f.trinh_do_id.length > 0 && !f.trinh_do_id.includes(tdKey)) return false;

  const llKey = item.ly_luan_chinh_tri_id ?? CHIP_FILTER_NULL;
  if (f.ly_luan_chinh_tri_id.length > 0 && !f.ly_luan_chinh_tri_id.includes(llKey)) return false;

  if (f.dang_vien.length > 0) {
    const wantYes = f.dang_vien.includes(CHIP_DANG_VIEN_YES);
    const wantNo = f.dang_vien.includes(CHIP_DANG_VIEN_NO);
    if (wantYes !== wantNo) {
      if (wantYes && !item.dang_vien) return false;
      if (wantNo && item.dang_vien) return false;
    }
  }

  return true;
}
