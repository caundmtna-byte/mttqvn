import { CHIP_FILTER_NULL } from '../../danh-sach-can-bo/core/constants';
import type { MttqTangLuongFilters, MttqTangLuongListRow } from '../core/types';
import { tangLuongMatchesColumnSearch } from './column-search';
import { matchesSearchTerm } from '@/lib/searchUtils';
import { MTTQ_TANG_LUONG_SEARCHABLE_KEYS } from './search-keys';

export type TangLuongChipFilterKey = keyof Pick<
  MttqTangLuongFilters,
  'loai_ky' | 'phong_ban_id' | 'don_vi_id' | 'to_chuc_id'
>;

export function omitTangLuongChipFilter(
  filters: MttqTangLuongFilters,
  key: TangLuongChipFilterKey,
): MttqTangLuongFilters {
  return { ...filters, [key]: [] };
}

export function tangLuongMatchesAllFilters(
  item: MttqTangLuongListRow,
  term: string,
  f: MttqTangLuongFilters,
): boolean {
  const matchesSearch = matchesSearchTerm(
    item as unknown as Record<string, unknown>,
    term,
    [...MTTQ_TANG_LUONG_SEARCHABLE_KEYS],
  );
  if (!matchesSearch) return false;
  if (!tangLuongMatchesColumnSearch(item, f.columnSearch)) return false;
  if (f.loai_ky?.length && !f.loai_ky.includes(item.loai_ky)) return false;
  if (f.phong_ban_id?.length) {
    const pb = item.phong_ban_id ?? CHIP_FILTER_NULL;
    if (!f.phong_ban_id.includes(pb)) return false;
  }
  if (f.don_vi_id?.length) {
    const dv = item.don_vi_id ?? CHIP_FILTER_NULL;
    if (!f.don_vi_id.includes(dv)) return false;
  }
  if (f.to_chuc_id?.length) {
    const tc = item.to_chuc_id ?? CHIP_FILTER_NULL;
    if (!f.to_chuc_id.includes(tc)) return false;
  }
  return true;
}
