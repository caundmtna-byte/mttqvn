import type { MttqTangLuongKeHoachRow, MttqTangLuongListRow, MttqTangLuongLoaiKy } from '../core/types';
import { CHIP_FILTER_NULL } from '../../danh-sach-can-bo/core/constants';
import { MTTQ_TANG_LUONG_LOAI_KY_OPTIONS } from '../core/constants';
import { computeNextDueDate, getLatestRecordForCanBo } from './tang-luong-cycle';
import { buildKeHoachRows } from './build-year-plan';

export interface TangLuongStatsKpis {
  totalRecords: number;
  totalCanBo: number;
  dungHan: number;
  truocHan: number;
  dueInYear: number;
  doneInYear: number;
}

export interface NamedCount {
  id: string;
  label: string;
  value: number;
}

const LOAI_LABEL = Object.fromEntries(
  MTTQ_TANG_LUONG_LOAI_KY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<MttqTangLuongLoaiKy, string>;

export function computeTangLuongKpis(
  rows: MttqTangLuongListRow[],
  year: number,
): TangLuongStatsKpis {
  const canBoSet = new Set(rows.map((r) => r.can_bo_id));
  const yearPrefix = String(year);
  const inYear = rows.filter((r) => r.ngay_nang_luong.startsWith(yearPrefix));
  const keHoach = buildKeHoachRows(rows, year);
  return {
    totalRecords: rows.length,
    totalCanBo: canBoSet.size,
    dungHan: rows.filter((r) => r.loai_ky === 'dung_han').length,
    truocHan: rows.filter((r) => r.loai_ky !== 'dung_han').length,
    dueInYear: keHoach.length,
    doneInYear: inYear.length,
  };
}

export function aggregateByLoaiKy(rows: MttqTangLuongListRow[]): NamedCount[] {
  const map = new Map<MttqTangLuongLoaiKy, number>();
  for (const r of rows) {
    map.set(r.loai_ky, (map.get(r.loai_ky) ?? 0) + 1);
  }
  return MTTQ_TANG_LUONG_LOAI_KY_OPTIONS.map((o) => ({
    id: o.value,
    label: o.label,
    value: map.get(o.value) ?? 0,
  })).filter((x) => x.value > 0);
}

export function aggregateByMonth(rows: MttqTangLuongListRow[], year?: number): NamedCount[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const y = r.ngay_nang_luong.slice(0, 4);
    const m = r.ngay_nang_luong.slice(5, 7);
    if (year != null && Number(y) !== year) continue;
    const key = `${y}-${m}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      id: key,
      label: key,
      value,
    }));
}

export function aggregateByPhongBan(rows: MttqTangLuongListRow[], limit = 10): NamedCount[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const r of rows) {
    const id = r.ten_phong_ban ?? '__none__';
    const label = r.ten_phong_ban ?? '—';
    const cur = map.get(id) ?? { label, count: 0 };
    cur.count += 1;
    map.set(id, cur);
  }
  return [...map.entries()]
    .map(([id, { label, count }]) => ({ id, label, value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function aggregateByNgachMoi(rows: MttqTangLuongListRow[], limit = 10): NamedCount[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const r of rows) {
    const id = r.ngach_luong_id_moi;
    const label = r.ten_ngach_moi;
    const cur = map.get(id) ?? { label, count: 0 };
    cur.count += 1;
    map.set(id, cur);
  }
  return [...map.entries()]
    .map(([id, { label, count }]) => ({ id, label, value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function aggregatePlanVsDone(
  allRows: MttqTangLuongListRow[],
  year: number,
): { due: number; done: number; pending: number } {
  const kpis = computeTangLuongKpis(allRows, year);
  return {
    due: kpis.dueInYear,
    done: kpis.doneInYear,
    pending: Math.max(0, kpis.dueInYear - kpis.doneInYear),
  };
}

export function getLatestSnapshotByCanBo(rows: MttqTangLuongListRow[]): Map<string, MttqTangLuongListRow> {
  const map = new Map<string, MttqTangLuongListRow>();
  const ids = new Set(rows.map((r) => r.can_bo_id));
  for (const id of ids) {
    const latest = getLatestRecordForCanBo(rows, id);
    if (latest) map.set(id, latest);
  }
  return map;
}

export function filterRowsForStats(
  rows: MttqTangLuongListRow[],
  opts: {
    year?: number;
    loaiKy?: string[];
    phongBanIds?: string[];
  },
): MttqTangLuongListRow[] {
  return rows.filter((r) => {
    if (opts.year != null && !r.ngay_nang_luong.startsWith(String(opts.year))) return false;
    if (opts.loaiKy?.length && !opts.loaiKy.includes(r.loai_ky)) return false;
    if (opts.phongBanIds?.length) {
      const pb = r.phong_ban_id?.trim() ? r.phong_ban_id : CHIP_FILTER_NULL;
      if (!opts.phongBanIds.includes(pb)) return false;
    }
    return true;
  });
}

export type { MttqTangLuongKeHoachRow };
