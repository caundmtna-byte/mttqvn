import { useMemo } from 'react';
import {
  CHIP_DANG_VIEN_NO,
  CHIP_DANG_VIEN_YES,
  CHIP_FILTER_NULL,
  CHIP_TRANG_THAI_NULL,
} from '../core/constants';
import type { MttqCanBoFilters, MttqCanBoRow } from '../core/types';
import { mttqCanBoMatchesAllFilters, omitChipFilter } from '../utils/mttq-can-bo-filter-match';
import { mttqCanBoCapQuanLyChipKeyFromRow } from '../utils/cap-quan-ly-chip-key';

export interface MttqCanBoFilterCounts {
  trangThaiCounts: Record<string, number>;
  gioiTinhCounts: Record<string, number>;
  toChucCounts: Record<string, number>;
  phongBanCounts: Record<string, number>;
  chucVuCounts: Record<string, number>;
  capQuanLyCounts: Record<string, number>;
  donViCounts: Record<string, number>;
  danTocCounts: Record<string, number>;
  trinhDoCounts: Record<string, number>;
  lyLuanCounts: Record<string, number>;
  dangVienCounts: Record<string, number>;
}

function bump(m: Record<string, number>, k: string) {
  m[k] = (m[k] ?? 0) + 1;
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
    const trangThaiCounts: Record<string, number> = {};
    const fNoTt = omitChipFilter(filters, 'trang_thai_id');
    for (const r of rows) {
      if (!mttqCanBoMatchesAllFilters(r, searchTerm, fNoTt)) continue;
      bump(trangThaiCounts, r.trang_thai_id ?? CHIP_TRANG_THAI_NULL);
    }

    const gioiTinhCounts: Record<string, number> = {};
    const fNoGt = omitChipFilter(filters, 'gioi_tinh');
    for (const r of rows) {
      if (!mttqCanBoMatchesAllFilters(r, searchTerm, fNoGt)) continue;
      if (!r.gioi_tinh) continue;
      bump(gioiTinhCounts, r.gioi_tinh);
    }

    const toChucCounts: Record<string, number> = {};
    const fNoTo = omitChipFilter(filters, 'to_chuc_id');
    for (const r of rows) {
      if (!mttqCanBoMatchesAllFilters(r, searchTerm, fNoTo)) continue;
      bump(toChucCounts, r.to_chuc_id ?? CHIP_FILTER_NULL);
    }

    const phongBanCounts: Record<string, number> = {};
    const fNoPb = omitChipFilter(filters, 'phong_ban_id');
    for (const r of rows) {
      if (!mttqCanBoMatchesAllFilters(r, searchTerm, fNoPb)) continue;
      bump(phongBanCounts, r.phong_ban_id ?? CHIP_FILTER_NULL);
    }

    const chucVuCounts: Record<string, number> = {};
    const fNoCv = omitChipFilter(filters, 'chuc_vu_id');
    for (const r of rows) {
      if (!mttqCanBoMatchesAllFilters(r, searchTerm, fNoCv)) continue;
      bump(chucVuCounts, r.chuc_vu_id ?? CHIP_FILTER_NULL);
    }

    const capQuanLyCounts: Record<string, number> = {};
    const fNoCap = omitChipFilter(filters, 'chuc_vu_cap_quan_ly');
    for (const r of rows) {
      if (!mttqCanBoMatchesAllFilters(r, searchTerm, fNoCap)) continue;
      bump(capQuanLyCounts, mttqCanBoCapQuanLyChipKeyFromRow(r));
    }

    const donViCounts: Record<string, number> = {};
    const fNoXa = omitChipFilter(filters, 'don_vi_id');
    for (const r of rows) {
      if (!mttqCanBoMatchesAllFilters(r, searchTerm, fNoXa)) continue;
      bump(donViCounts, r.don_vi_id ?? CHIP_FILTER_NULL);
    }

    const danTocCounts: Record<string, number> = {};
    const fNoDt = omitChipFilter(filters, 'dan_toc_id');
    for (const r of rows) {
      if (!mttqCanBoMatchesAllFilters(r, searchTerm, fNoDt)) continue;
      bump(danTocCounts, r.dan_toc_id ?? CHIP_FILTER_NULL);
    }

    const trinhDoCounts: Record<string, number> = {};
    const fNoTd = omitChipFilter(filters, 'trinh_do_id');
    for (const r of rows) {
      if (!mttqCanBoMatchesAllFilters(r, searchTerm, fNoTd)) continue;
      bump(trinhDoCounts, r.trinh_do_id ?? CHIP_FILTER_NULL);
    }

    const lyLuanCounts: Record<string, number> = {};
    const fNoLl = omitChipFilter(filters, 'ly_luan_chinh_tri_id');
    for (const r of rows) {
      if (!mttqCanBoMatchesAllFilters(r, searchTerm, fNoLl)) continue;
      bump(lyLuanCounts, r.ly_luan_chinh_tri_id ?? CHIP_FILTER_NULL);
    }

    const dangVienCounts: Record<string, number> = {
      [CHIP_DANG_VIEN_YES]: 0,
      [CHIP_DANG_VIEN_NO]: 0,
    };
    const fNoDv = omitChipFilter(filters, 'dang_vien');
    for (const r of rows) {
      if (!mttqCanBoMatchesAllFilters(r, searchTerm, fNoDv)) continue;
      if (r.dang_vien) dangVienCounts[CHIP_DANG_VIEN_YES] += 1;
      else dangVienCounts[CHIP_DANG_VIEN_NO] += 1;
    }

    return {
      trangThaiCounts,
      gioiTinhCounts,
      toChucCounts,
      phongBanCounts,
      chucVuCounts,
      capQuanLyCounts,
      donViCounts,
      danTocCounts,
      trinhDoCounts,
      lyLuanCounts,
      dangVienCounts,
    };
  }, [rows, searchTerm, filters]);
}
