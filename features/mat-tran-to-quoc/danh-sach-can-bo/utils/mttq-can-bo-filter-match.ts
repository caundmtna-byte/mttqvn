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
import { normalizeMttqCanBoFilters } from './mttq-can-bo-filters-normalize';

export type MttqCanBoChipFilterKey = Exclude<keyof MttqCanBoFilters, 'columnSearch'>;

export function omitChipFilter(f: MttqCanBoFilters, key: MttqCanBoChipFilterKey): MttqCanBoFilters {
  return { ...normalizeMttqCanBoFilters(f), [key]: [] };
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
  const F = normalizeMttqCanBoFilters(f);
  if (!mttqCanBoMatchesColumnSearch(item, F)) return false;

  const ttKey = item.trang_thai_id ?? CHIP_TRANG_THAI_NULL;
  if (F.trang_thai_id.length > 0 && !F.trang_thai_id.includes(ttKey)) return false;

  if (F.gioi_tinh.length > 0 && !F.gioi_tinh.includes(item.gioi_tinh)) return false;

  const toKey = item.to_chuc_id ?? CHIP_FILTER_NULL;
  if (F.to_chuc_id.length > 0 && !F.to_chuc_id.includes(toKey)) return false;

  const pbKey = item.phong_ban_id ?? CHIP_FILTER_NULL;
  if (F.phong_ban_id.length > 0 && !F.phong_ban_id.includes(pbKey)) return false;

  const cvKey = item.chuc_vu_id ?? CHIP_FILTER_NULL;
  if (F.chuc_vu_id.length > 0 && !F.chuc_vu_id.includes(cvKey)) return false;

  const capKey = mttqCanBoCapQuanLyChipKeyFromRow(item);
  if (F.chuc_vu_cap_quan_ly.length > 0 && !F.chuc_vu_cap_quan_ly.includes(capKey)) return false;

  const xaKey = item.don_vi_id ?? CHIP_FILTER_NULL;
  if (F.don_vi_id.length > 0 && !F.don_vi_id.includes(xaKey)) return false;

  const dtKey = item.dan_toc_id ?? CHIP_FILTER_NULL;
  if (F.dan_toc_id.length > 0 && !F.dan_toc_id.includes(dtKey)) return false;

  const tdKey = item.trinh_do_id ?? CHIP_FILTER_NULL;
  if (F.trinh_do_id.length > 0 && !F.trinh_do_id.includes(tdKey)) return false;

  const llKey = item.ly_luan_chinh_tri_id ?? CHIP_FILTER_NULL;
  if (F.ly_luan_chinh_tri_id.length > 0 && !F.ly_luan_chinh_tri_id.includes(llKey)) return false;

  if (F.dang_vien.length > 0) {
    const wantYes = F.dang_vien.includes(CHIP_DANG_VIEN_YES);
    const wantNo = F.dang_vien.includes(CHIP_DANG_VIEN_NO);
    if (wantYes !== wantNo) {
      if (wantYes && !item.dang_vien) return false;
      if (wantNo && item.dang_vien) return false;
    }
  }

  return true;
}
