import { useMemo } from 'react';
import { CHIP_FILTER_NULL } from '../../danh-sach-can-bo/core/constants';
import type { MttqTangLuongFilters, MttqTangLuongListRow } from '../core/types';
import {
  omitTangLuongChipFilter,
  tangLuongMatchesAllFilters,
  type TangLuongChipFilterKey,
} from '../utils/tang-luong-filter-match';

function bump(m: Record<string, number>, k: string) {
  m[k] = (m[k] ?? 0) + 1;
}

function countByKey(
  rows: MttqTangLuongListRow[],
  searchTerm: string,
  filters: MttqTangLuongFilters,
  chipKey: TangLuongChipFilterKey,
  valueOf: (r: MttqTangLuongListRow) => string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  const f = omitTangLuongChipFilter(filters, chipKey);
  for (const r of rows) {
    if (!tangLuongMatchesAllFilters(r, searchTerm, f)) continue;
    bump(counts, valueOf(r));
  }
  return counts;
}

export function useTangLuongFilterCounts(
  rows: MttqTangLuongListRow[],
  searchTerm: string,
  filters: MttqTangLuongFilters,
) {
  return useMemo(() => {
    const loaiKyCounts = countByKey(rows, searchTerm, filters, 'loai_ky', (r) => r.loai_ky);
    const phongBanCounts = countByKey(rows, searchTerm, filters, 'phong_ban_id', (r) =>
      r.phong_ban_id?.trim() ? r.phong_ban_id : CHIP_FILTER_NULL,
    );
    const donViCounts = countByKey(rows, searchTerm, filters, 'don_vi_id', (r) =>
      r.don_vi_id?.trim() ? r.don_vi_id : CHIP_FILTER_NULL,
    );
    const toChucCounts = countByKey(rows, searchTerm, filters, 'to_chuc_id', (r) =>
      r.to_chuc_id?.trim() ? r.to_chuc_id : CHIP_FILTER_NULL,
    );
    return { loaiKyCounts, phongBanCounts, donViCounts, toChucCounts };
  }, [rows, searchTerm, filters]);
}
