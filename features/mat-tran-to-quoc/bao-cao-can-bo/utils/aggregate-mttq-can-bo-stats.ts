import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { MttqCanBoRow } from '../../danh-sach-can-bo/core/types';
import { CHIP_FILTER_NULL, CHIP_TRANG_THAI_NULL } from '../../danh-sach-can-bo/core/constants';
import { normalizeCapQuanLyInput } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

dayjs.extend(isoWeek);

export interface OfficerStatsDimensionFilters {
  trang_thai_id: string[];
  gioi_tinh: string[];
  chuc_vu_id: string[];
  /** Giá trị `var_chuc_vu.cap_quan_ly` (Tỉnh / Xã phường) — rỗng = `__null__` */
  cap_quan_ly: string[];
  phong_ban_id: string[];
  don_vi_id: string[];
  dan_toc_id: string[];
  trinh_do_id: string[];
  ly_luan_chinh_tri_id: string[];
  to_chuc_id: string[];
  /** `'true'` | `'false'` — đa chọn = OR trong nhóm */
  dang_vien: string[];
}

export interface ResolvedDateRange {
  start: string;
  end: string;
  /** Preset «Tất cả» — không lọc theo ngày tạo (`tg_tao`). */
  allTime?: boolean;
}

export const OFFICER_STATS_PRESET_IDS = [
  'all',
  'thisWeek',
  'thisMonth',
  'thisQuarter',
  'thisYear',
  'custom',
] as const;

export function resolveOfficerStatsDateRange(
  preset: string,
  customStart: string,
  customEnd: string,
  now: Date = new Date(),
): ResolvedDateRange {
  const d = dayjs(now);
  const end = d.format('YYYY-MM-DD');

  switch (preset) {
    case 'all':
      return { start: '', end: '', allTime: true };
    case 'thisWeek': {
      const start = d.startOf('isoWeek').format('YYYY-MM-DD');
      return { start, end };
    }
    case 'thisMonth': {
      const start = d.startOf('month').format('YYYY-MM-DD');
      return { start, end };
    }
    case 'thisQuarter': {
      const m = d.month();
      const qStartMonth = Math.floor(m / 3) * 3;
      const start = d.month(qStartMonth).startOf('month').format('YYYY-MM-DD');
      return { start, end };
    }
    case 'thisYear': {
      const start = d.startOf('year').format('YYYY-MM-DD');
      return { start, end };
    }
    case 'custom': {
      const s = (customStart || end).slice(0, 10);
      const e = (customEnd || end).slice(0, 10);
      if (s <= e) return { start: s, end: e };
      return { start: e, end: s };
    }
    default: {
      const start = d.startOf('month').format('YYYY-MM-DD');
      return { start, end };
    }
  }
}

export function getOfficerStatsDateFromCreatedAt(item: MttqCanBoRow): string {
  const raw = item.tg_tao;
  if (!raw) return '';
  return dayjs(raw).format('YYYY-MM-DD');
}

export function isDateInRange(dateStr: string, start: string, end: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= start.slice(0, 10) && d <= end.slice(0, 10);
}

function matchesTrangThai(row: MttqCanBoRow, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const id = row.trang_thai_id?.trim() ? String(row.trang_thai_id) : CHIP_TRANG_THAI_NULL;
  return selected.includes(id);
}

function matchesNullableFk(rowVal: string | null | undefined, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const id = rowVal?.trim() ? String(rowVal) : CHIP_TRANG_THAI_NULL;
  return selected.includes(id);
}

function matchesDangVien(row: MttqCanBoRow, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const v = row.dang_vien ? 'true' : 'false';
  return selected.includes(v);
}

/** Khoảng ngày vẽ biểu đồ xu hướng (preset «Tất cả» → min–max `tg_tao` trên tập đã lọc). */
export function resolveOfficerStatsTrendChartRange(
  range: ResolvedDateRange,
  filtered: MttqCanBoRow[],
): ResolvedDateRange {
  if (!range.allTime) {
    return { start: range.start, end: range.end };
  }
  let min = '';
  let max = '';
  for (const item of filtered) {
    const d = getOfficerStatsDateFromCreatedAt(item);
    if (!d) continue;
    const day = d.slice(0, 10);
    if (!min || day < min) min = day;
    if (!max || day > max) max = day;
  }
  const today = dayjs().format('YYYY-MM-DD');
  if (!min || !max) {
    return { start: today, end: today };
  }
  return { start: min, end: max };
}

export function filterRowsForOfficerStats(
  items: MttqCanBoRow[],
  range: ResolvedDateRange,
  dims: OfficerStatsDimensionFilters,
): MttqCanBoRow[] {
  return items.filter((row) => {
    if (!range.allTime) {
      const d = getOfficerStatsDateFromCreatedAt(row);
      if (!isDateInRange(d, range.start, range.end)) return false;
    }
    if (!matchesTrangThai(row, dims.trang_thai_id)) return false;
    if (dims.gioi_tinh.length > 0 && !dims.gioi_tinh.includes(String(row.gioi_tinh))) return false;
    if (!matchesNullableFk(row.chuc_vu_id, dims.chuc_vu_id)) return false;
    if (dims.cap_quan_ly.length > 0) {
      const capKey = normalizeCapQuanLyInput(row.chuc_vu_cap_quan_ly) ?? CHIP_FILTER_NULL;
      if (!dims.cap_quan_ly.includes(capKey)) return false;
    }
    if (!matchesNullableFk(row.phong_ban_id, dims.phong_ban_id)) return false;
    if (!matchesNullableFk(row.don_vi_id, dims.don_vi_id)) return false;
    if (!matchesNullableFk(row.dan_toc_id, dims.dan_toc_id)) return false;
    if (!matchesNullableFk(row.trinh_do_id, dims.trinh_do_id)) return false;
    if (!matchesNullableFk(row.ly_luan_chinh_tri_id, dims.ly_luan_chinh_tri_id)) return false;
    if (!matchesNullableFk(row.to_chuc_id, dims.to_chuc_id)) return false;
    if (!matchesDangVien(row, dims.dang_vien)) return false;
    return true;
  });
}

export function computeOfficerStatsKpis(filtered: MttqCanBoRow[]): {
  totalCount: number;
  countNam: number;
  countNu: number;
  countDangVien: number;
} {
  let countNam = 0;
  let countNu = 0;
  let countDangVien = 0;
  for (const r of filtered) {
    if (r.gioi_tinh === 'Nam') countNam += 1;
    else if (r.gioi_tinh === 'Nữ') countNu += 1;
    if (r.dang_vien) countDangVien += 1;
  }
  return {
    totalCount: filtered.length,
    countNam,
    countNu,
    countDangVien,
  };
}

export type TrendBucket = 'day' | 'month';

export function pickTrendBucket(start: string, end: string): TrendBucket {
  const a = dayjs(start.slice(0, 10));
  const b = dayjs(end.slice(0, 10));
  const days = b.diff(a, 'day');
  return days > 62 ? 'month' : 'day';
}

export interface OfficerTrendPoint {
  key: string;
  label: string;
  count: number;
}

export function buildOfficerTrendSeries(
  filtered: MttqCanBoRow[],
  range: ResolvedDateRange,
  bucket: TrendBucket,
): OfficerTrendPoint[] {
  const start = dayjs(range.start.slice(0, 10));
  const end = dayjs(range.end.slice(0, 10));
  const keys: string[] = [];
  if (bucket === 'day') {
    for (let cur = start; !cur.isAfter(end, 'day'); cur = cur.add(1, 'day')) {
      keys.push(cur.format('YYYY-MM-DD'));
    }
  } else {
    for (let cur = start.startOf('month'); !cur.isAfter(end, 'month'); cur = cur.add(1, 'month')) {
      keys.push(cur.format('YYYY-MM'));
    }
  }

  const map = new Map<string, number>();
  for (const k of keys) {
    map.set(k, 0);
  }

  for (const item of filtered) {
    const d = getOfficerStatsDateFromCreatedAt(item);
    if (!d) continue;
    const key = bucket === 'day' ? d.slice(0, 10) : d.slice(0, 7);
    if (!map.has(key)) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return keys.map((key) => {
    const count = map.get(key) ?? 0;
    const label =
      bucket === 'day' ? dayjs(key).format('DD/MM') : dayjs(key + '-01').format('MM/YYYY');
    return { key, label, count };
  });
}

export interface LabelCountRow {
  id: string;
  label: string;
  value: number;
}

export function aggregateOfficerTopCounts(
  filtered: MttqCanBoRow[],
  mode: 'phong_ban' | 'don_vi' | 'chuc_vu',
  topN: number,
): LabelCountRow[] {
  const tally = new Map<string, { label: string; count: number }>();
  for (const row of filtered) {
    let id: string;
    let label: string;
    switch (mode) {
      case 'phong_ban': {
        id = row.phong_ban_id?.trim() ? String(row.phong_ban_id) : CHIP_TRANG_THAI_NULL;
        label =
          [row.ten_bo_phan?.trim(), row.ten_phong_ban?.trim()].filter(Boolean).join(' — ') ||
          (id === CHIP_TRANG_THAI_NULL ? '—' : id);
        break;
      }
      case 'don_vi': {
        id = row.don_vi_id?.trim() ? String(row.don_vi_id) : CHIP_TRANG_THAI_NULL;
        label = row.ten_don_vi?.trim() || (id === CHIP_TRANG_THAI_NULL ? '—' : id);
        break;
      }
      case 'chuc_vu': {
        id = row.chuc_vu_id?.trim() ? String(row.chuc_vu_id) : CHIP_TRANG_THAI_NULL;
        label = row.ten_chuc_vu?.trim() || (id === CHIP_TRANG_THAI_NULL ? '—' : id);
        break;
      }
      default:
        id = '';
        label = '';
    }
    const prev = tally.get(id);
    if (prev) prev.count += 1;
    else tally.set(id, { label, count: 1 });
  }
  const rows = [...tally.entries()]
    .map(([rid, v]) => ({ id: rid, label: v.label, value: v.count }))
    .sort((a, b) => b.value - a.value);
  return rows.slice(0, topN);
}

export function buildGioiTinhBarData(filtered: MttqCanBoRow[]): { label: string; count: number }[] {
  const order = ['Nam', 'Nữ', 'Khác'] as const;
  const map = new Map<string, number>();
  for (const g of order) map.set(g, 0);
  for (const r of filtered) {
    const g = order.includes(r.gioi_tinh as (typeof order)[number]) ? r.gioi_tinh : 'Khác';
    map.set(g, (map.get(g) ?? 0) + 1);
  }
  return order.map((label) => ({ label, count: map.get(label) ?? 0 }));
}

export type OfficerLookupSortKey =
  | 'ho_ten'
  | 'ten_don_vi'
  | 'ten_chuc_vu'
  | 'chuc_vu_cap_quan_ly'
  | 'ten_trang_thai'
  | 'dien_thoai'
  | 'tuoi'
  | 'gioi_tinh';

export function sortOfficerLookupRows(
  rows: MttqCanBoRow[],
  sortKey: OfficerLookupSortKey,
  direction: 'asc' | 'desc',
  getLanguage: () => string,
): MttqCanBoRow[] {
  const dir = direction === 'asc' ? 1 : -1;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let cmp: number;
    switch (sortKey) {
      case 'tuoi':
        cmp = (Number(a.tuoi) || 0) - (Number(b.tuoi) || 0);
        break;
      case 'ten_don_vi':
        cmp = String(a.ten_don_vi ?? '').localeCompare(String(b.ten_don_vi ?? ''), getLanguage());
        break;
      case 'ten_chuc_vu':
        cmp = String(a.ten_chuc_vu ?? '').localeCompare(String(b.ten_chuc_vu ?? ''), getLanguage());
        break;
      case 'chuc_vu_cap_quan_ly': {
        const ka = normalizeCapQuanLyInput(a.chuc_vu_cap_quan_ly) ?? '';
        const kb = normalizeCapQuanLyInput(b.chuc_vu_cap_quan_ly) ?? '';
        cmp = ka.localeCompare(kb, getLanguage());
        break;
      }
      case 'ten_trang_thai':
        cmp = String(a.ten_trang_thai ?? '').localeCompare(String(b.ten_trang_thai ?? ''), getLanguage());
        break;
      case 'dien_thoai':
        cmp = String(a.dien_thoai ?? '').localeCompare(String(b.dien_thoai ?? ''), getLanguage());
        break;
      case 'gioi_tinh':
        cmp = String(a.gioi_tinh).localeCompare(String(b.gioi_tinh), getLanguage());
        break;
      default:
        cmp = String(a.ho_ten).localeCompare(String(b.ho_ten), getLanguage());
    }
    return cmp * dir;
  });
  return sorted;
}
