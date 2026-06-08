import { useMemo } from 'react';
import { txt } from '@/lib/text';
import { CHIP_FILTER_NULL } from '../../danh-sach-can-bo/core/constants';
import { MTTQ_TANG_LUONG_LOAI_KY_OPTIONS } from '../core/constants';
import type { MttqTangLuongFilters, MttqTangLuongListRow } from '../core/types';
import { useTangLuongFilterCounts } from './use-tang-luong-filter-counts';

export interface TangLuongChipOption {
  label: string;
  value: string;
  count: number;
}

export interface TangLuongChipOptions {
  loaiKy: TangLuongChipOption[];
  phongBan: TangLuongChipOption[];
  chucVu: TangLuongChipOption[];
  donVi: TangLuongChipOption[];
  toChuc: TangLuongChipOption[];
}

export function useTangLuongChipOptions(
  rows: MttqTangLuongListRow[],
  searchTerm: string,
  filters: MttqTangLuongFilters,
): TangLuongChipOptions {
  const counts = useTangLuongFilterCounts(rows, searchTerm, filters);

  return useMemo(() => {
    const loaiKy = MTTQ_TANG_LUONG_LOAI_KY_OPTIONS.map((o) => ({
      label: o.label,
      value: o.value,
      count: counts.loaiKyCounts[o.value] ?? 0,
    }));

    const phongBanLabels = new Map<string, string>();
    for (const r of rows) {
      const value = r.phong_ban_id?.trim() ? r.phong_ban_id : CHIP_FILTER_NULL;
      if (!phongBanLabels.has(value)) {
        phongBanLabels.set(value, (r.ten_phong_ban ?? '').trim() || txt('common.emptyCell'));
      }
    }
    const phongBan = [...phongBanLabels.entries()]
      .map(([value, label]) => ({
        value,
        label,
        count: counts.phongBanCounts[value] ?? 0,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));

    const chucVuLabels = new Map<string, string>();
    for (const r of rows) {
      const value = r.chuc_vu_id?.trim() ? r.chuc_vu_id : CHIP_FILTER_NULL;
      if (!chucVuLabels.has(value)) {
        chucVuLabels.set(value, (r.ten_chuc_vu ?? '').trim() || txt('common.emptyCell'));
      }
    }
    const chucVu = [...chucVuLabels.entries()]
      .map(([value, label]) => ({
        value,
        label,
        count: counts.chucVuCounts[value] ?? 0,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));

    const donViLabels = new Map<string, string>();
    for (const r of rows) {
      const value = r.don_vi_id?.trim() ? r.don_vi_id : CHIP_FILTER_NULL;
      if (!donViLabels.has(value)) {
        donViLabels.set(value, (r.ten_don_vi ?? '').trim() || txt('common.emptyCell'));
      }
    }
    const donVi = [...donViLabels.entries()]
      .map(([value, label]) => ({
        value,
        label,
        count: counts.donViCounts[value] ?? 0,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));

    const toChucLabels = new Map<string, string>();
    for (const r of rows) {
      const value = r.to_chuc_id?.trim() ? r.to_chuc_id : CHIP_FILTER_NULL;
      if (!toChucLabels.has(value)) {
        toChucLabels.set(value, (r.ten_to_chuc ?? '').trim() || txt('common.emptyCell'));
      }
    }
    const toChuc = [...toChucLabels.entries()]
      .map(([value, label]) => ({
        value,
        label,
        count: counts.toChucCounts[value] ?? 0,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));

    return { loaiKy, phongBan, chucVu, donVi, toChuc };
  }, [rows, counts]);
}
