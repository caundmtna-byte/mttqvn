import { useMemo } from 'react';
import { matchesSearchTerm } from '@/lib/searchUtils';
import type { MttqCanBoFilters, MttqCanBoRow } from '../core/types';
import { CHIP_TRANG_THAI_NULL } from '../core/constants';
import { MTTQ_CAN_BO_SEARCHABLE_KEYS } from '../utils/search-keys';
import { mttqCanBoMatchesColumnSearch } from '../utils/column-search';

export interface MttqCanBoFilterCounts {
  /** Số bản ghi theo từng `trang_thai_id` (hoặc chip null), sau khi bỏ filter trạng thái. */
  trangThaiCounts: Record<string, number>;
  /** Số bản ghi theo từng `gioi_tinh`, sau khi bỏ filter giới tính. */
  gioiTinhCounts: Record<string, number>;
}

/**
 * Đếm tuỳ chọn multi-select (exclude-self) để counts phản ánh search + columnSearch + filter nhóm kia.
 */
export function useMttqCanBoFilterCounts(
  rows: MttqCanBoRow[],
  searchTerm: string,
  filters: MttqCanBoFilters,
): MttqCanBoFilterCounts {
  return useMemo(() => {
    const passesBase = (r: MttqCanBoRow, f: MttqCanBoFilters) => {
      if (
        !matchesSearchTerm(
          r as unknown as Record<string, unknown>,
          searchTerm,
          MTTQ_CAN_BO_SEARCHABLE_KEYS,
        )
      ) {
        return false;
      }
      if (!mttqCanBoMatchesColumnSearch(r, f)) return false;
      return true;
    };

    const trangThaiCounts: Record<string, number> = {};
    const fNoTt: MttqCanBoFilters = { ...filters, trang_thai_id: [] };
    for (const r of rows) {
      if (!passesBase(r, fNoTt)) continue;
      if (filters.gioi_tinh.length > 0 && !filters.gioi_tinh.includes(r.gioi_tinh)) continue;
      const key = r.trang_thai_id ?? CHIP_TRANG_THAI_NULL;
      trangThaiCounts[key] = (trangThaiCounts[key] ?? 0) + 1;
    }

    const gioiTinhCounts: Record<string, number> = {};
    const fNoGt: MttqCanBoFilters = { ...filters, gioi_tinh: [] };
    for (const r of rows) {
      if (!passesBase(r, fNoGt)) continue;
      if (filters.trang_thai_id.length > 0) {
        const key = r.trang_thai_id ?? CHIP_TRANG_THAI_NULL;
        if (!filters.trang_thai_id.includes(key)) continue;
      }
      if (!r.gioi_tinh) continue;
      gioiTinhCounts[r.gioi_tinh] = (gioiTinhCounts[r.gioi_tinh] ?? 0) + 1;
    }

    return { trangThaiCounts, gioiTinhCounts };
  }, [rows, searchTerm, filters]);
}
