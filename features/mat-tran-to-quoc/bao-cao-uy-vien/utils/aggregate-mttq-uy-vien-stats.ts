import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { MttqUyVienUyBan } from '../../uy-vien-uy-ban/core/types';
import { isUyVienTrangThamGia } from '../../uy-vien-uy-ban/core/constants';
import { CHIP_TRANG_THAI_NULL } from '../../danh-sach-can-bo/core/constants';

dayjs.extend(isoWeek);

export type MttqUyVienStatsRow = MttqUyVienUyBan & { tuoi?: number };

export interface UyVienStatsDimensionFilters {
  nhiem_ky_id: string[];
  don_vi_id: string[];
  gioi_tinh: string[];
  trang_thai_tham_gia: string[];
  dang_vien: string[];
}

export interface ResolvedDateRange {
  start: string;
  end: string;
}

export function resolveUyVienStatsDateRange(
  preset: string,
  customStart: string,
  customEnd: string,
  now: Date = new Date(),
): ResolvedDateRange {
  const d = dayjs(now);
  const end = d.format('YYYY-MM-DD');

  switch (preset) {
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

export function getUyVienStatsDateFromCreatedAt(item: MttqUyVienUyBan): string {
  const raw = item.tg_tao;
  if (!raw) return '';
  return dayjs(raw).format('YYYY-MM-DD');
}

export function isDateInRange(dateStr: string, start: string, end: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= start.slice(0, 10) && d <= end.slice(0, 10);
}

function matchesNullableFk(rowVal: string | null | undefined, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const id = rowVal?.trim() ? String(rowVal) : CHIP_TRANG_THAI_NULL;
  return selected.includes(id);
}

function matchesTrangThamGia(row: MttqUyVienUyBan, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const raw = row.trang_thai_tham_gia?.trim();
  const id = raw && isUyVienTrangThamGia(raw) ? raw : CHIP_TRANG_THAI_NULL;
  return selected.includes(id);
}

function matchesDangVien(row: MttqUyVienUyBan, selected: string[]): boolean {
  if (selected.length === 0) return true;
  const v = row.dang_vien ? 'true' : 'false';
  return selected.includes(v);
}

export function filterRowsForUyVienStats(
  items: MttqUyVienUyBan[],
  range: ResolvedDateRange,
  dims: UyVienStatsDimensionFilters,
): MttqUyVienUyBan[] {
  return items.filter((row) => {
    const d = getUyVienStatsDateFromCreatedAt(row);
    if (!isDateInRange(d, range.start, range.end)) return false;
    if (!matchesNullableFk(row.nhiem_ky_id, dims.nhiem_ky_id)) return false;
    if (!matchesNullableFk(row.don_vi_id, dims.don_vi_id)) return false;
    if (dims.gioi_tinh.length > 0 && !dims.gioi_tinh.includes(String(row.gioi_tinh))) return false;
    if (!matchesTrangThamGia(row, dims.trang_thai_tham_gia)) return false;
    if (!matchesDangVien(row, dims.dang_vien)) return false;
    return true;
  });
}

export function computeUyVienStatsKpis(filtered: MttqUyVienUyBan[]): {
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

export interface UyVienTrendPoint {
  key: string;
  label: string;
  count: number;
}

export function buildUyVienTrendSeries(
  filtered: MttqUyVienUyBan[],
  range: ResolvedDateRange,
  bucket: TrendBucket,
): UyVienTrendPoint[] {
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
    const d = getUyVienStatsDateFromCreatedAt(item);
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

export function aggregateUyVienTopCounts(
  filtered: MttqUyVienUyBan[],
  mode: 'don_vi' | 'nhiem_ky' | 'chuc_vu_don_vi',
  topN: number,
): LabelCountRow[] {
  const tally = new Map<string, { label: string; count: number }>();
  for (const row of filtered) {
    let id: string;
    let label: string;
    switch (mode) {
      case 'don_vi': {
        id = row.don_vi_id?.trim() ? String(row.don_vi_id) : CHIP_TRANG_THAI_NULL;
        label = row.ten_don_vi?.trim() || (id === CHIP_TRANG_THAI_NULL ? '—' : id);
        break;
      }
      case 'nhiem_ky': {
        id = row.nhiem_ky_id?.trim() ? String(row.nhiem_ky_id) : CHIP_TRANG_THAI_NULL;
        label = row.ten_nhiem_ky?.trim() || (id === CHIP_TRANG_THAI_NULL ? '—' : id);
        break;
      }
      case 'chuc_vu_don_vi': {
        const raw = row.chuc_vu_don_vi?.trim() || '';
        id = raw ? raw : CHIP_TRANG_THAI_NULL;
        label = raw || '—';
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

export function buildUyVienGioiTinhBarData(filtered: MttqUyVienUyBan[]): { label: string; count: number }[] {
  const order = ['Nam', 'Nữ', 'Khác'] as const;
  const map = new Map<string, number>();
  for (const g of order) map.set(g, 0);
  for (const r of filtered) {
    const raw = r.gioi_tinh;
    const g: (typeof order)[number] =
      raw != null && order.includes(raw as (typeof order)[number]) ? (raw as (typeof order)[number]) : 'Khác';
    map.set(g, (map.get(g) ?? 0) + 1);
  }
  return order.map((label) => ({ label, count: map.get(label) ?? 0 }));
}

export type UyVienLookupSortKey =
  | 'ho_va_ten'
  | 'ten_nhiem_ky'
  | 'ten_don_vi'
  | 'chuc_vu_don_vi'
  | 'trang_thai_tham_gia'
  | 'so_dien_thoai'
  | 'tuoi'
  | 'gioi_tinh';

export function sortUyVienLookupRows(
  rows: MttqUyVienStatsRow[],
  sortKey: UyVienLookupSortKey,
  direction: 'asc' | 'desc',
  getLanguage: () => string,
): MttqUyVienStatsRow[] {
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
      case 'ten_nhiem_ky':
        cmp = String(a.ten_nhiem_ky ?? '').localeCompare(String(b.ten_nhiem_ky ?? ''), getLanguage());
        break;
      case 'chuc_vu_don_vi':
        cmp = String(a.chuc_vu_don_vi ?? '').localeCompare(String(b.chuc_vu_don_vi ?? ''), getLanguage());
        break;
      case 'trang_thai_tham_gia':
        cmp = String(a.trang_thai_tham_gia ?? '').localeCompare(String(b.trang_thai_tham_gia ?? ''), getLanguage());
        break;
      case 'so_dien_thoai':
        cmp = String(a.so_dien_thoai ?? '').localeCompare(String(b.so_dien_thoai ?? ''), getLanguage());
        break;
      case 'gioi_tinh':
        cmp = String(a.gioi_tinh ?? '').localeCompare(String(b.gioi_tinh ?? ''), getLanguage());
        break;
      default:
        cmp = String(a.ho_va_ten).localeCompare(String(b.ho_va_ten), getLanguage());
    }
    return cmp * dir;
  });
  return sorted;
}
