import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { ChuongTrinhNamListRow } from '../core/types';
import { CHUONG_TRINH_NAM_TRANG_THAI } from '../core/constants';

dayjs.extend(isoWeek);

/** Khớp sentinel lọc phòng ban trong list module */
export const CHUONG_TRINH_STATS_PHONG_BAN_NONE = '__none__';

export interface ChuongTrinhNamStatsDimensionFilters {
  trang_thai: string[];
  id_phong_ban: string[];
  nam_bat_dau: string[];
}

export interface ResolvedDateRange {
  start: string;
  end: string;
}

export function resolveChuongTrinhNamStatsDateRange(
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

export function getChuongTrinhNamStatsDateFromTgTao(item: ChuongTrinhNamListRow): string {
  const raw = item.tg_tao;
  if (!raw) return '';
  return dayjs(raw).format('YYYY-MM-DD');
}

export function isDateInChuongTrinhRange(dateStr: string, start: string, end: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= start.slice(0, 10) && d <= end.slice(0, 10);
}

function yearFromNgayBatDau(d: string | null | undefined): string | null {
  if (!d?.trim()) return null;
  const y = d.trim().slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}

export function filterRowsForChuongTrinhNamStats(
  items: ChuongTrinhNamListRow[],
  range: ResolvedDateRange,
  dims: ChuongTrinhNamStatsDimensionFilters,
): ChuongTrinhNamListRow[] {
  return items.filter((row) => {
    const d = getChuongTrinhNamStatsDateFromTgTao(row);
    if (!isDateInChuongTrinhRange(d, range.start, range.end)) return false;
    if (dims.trang_thai.length > 0 && !dims.trang_thai.includes(row.trang_thai)) return false;
    if (dims.id_phong_ban.length > 0) {
      const pb = row.id_phong_ban?.trim() ? String(row.id_phong_ban) : CHUONG_TRINH_STATS_PHONG_BAN_NONE;
      if (!dims.id_phong_ban.includes(pb)) return false;
    }
    if (dims.nam_bat_dau.length > 0) {
      const y = yearFromNgayBatDau(row.ngay_bat_dau);
      if (!y || !dims.nam_bat_dau.includes(y)) return false;
    }
    return true;
  });
}

export interface ChuongTrinhNamStatsKpis {
  total: number;
  hoatDong: number;
  tamDung: number;
  ketThuc: number;
}

export function computeChuongTrinhNamStatsKpis(filtered: ChuongTrinhNamListRow[]): ChuongTrinhNamStatsKpis {
  let hoatDong = 0;
  let tamDung = 0;
  let ketThuc = 0;
  for (const r of filtered) {
    if (r.trang_thai === 'Hoạt động') hoatDong += 1;
    else if (r.trang_thai === 'Tạm dừng') tamDung += 1;
    else if (r.trang_thai === 'Kết thúc') ketThuc += 1;
  }
  return { total: filtered.length, hoatDong, tamDung, ketThuc };
}

export type ChuongTrinhTrendBucket = 'day' | 'month';

export function pickChuongTrinhTrendBucket(start: string, end: string): ChuongTrinhTrendBucket {
  const a = dayjs(start.slice(0, 10));
  const b = dayjs(end.slice(0, 10));
  const days = b.diff(a, 'day');
  return days > 62 ? 'month' : 'day';
}

export interface ChuongTrinhTrendPoint {
  key: string;
  label: string;
  count: number;
}

export function buildChuongTrinhTrendSeries(
  filtered: ChuongTrinhNamListRow[],
  range: ResolvedDateRange,
  bucket: ChuongTrinhTrendBucket,
): ChuongTrinhTrendPoint[] {
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
    const d = getChuongTrinhNamStatsDateFromTgTao(item);
    if (!d) continue;
    const key = bucket === 'day' ? d.slice(0, 10) : d.slice(0, 7);
    if (!map.has(key)) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return keys.map((key) => {
    const count = map.get(key) ?? 0;
    const label =
      bucket === 'day' ? dayjs(key).format('DD/MM') : dayjs(`${key}-01`).format('MM/YYYY');
    return { key, label, count };
  });
}

export interface LabelCountRow {
  id: string;
  label: string;
  value: number;
}

export function aggregateChuongTrinhTopPhongBan(filtered: ChuongTrinhNamListRow[], topN: number): LabelCountRow[] {
  const tally = new Map<string, { label: string; count: number }>();
  for (const row of filtered) {
    const id = row.id_phong_ban?.trim() ? String(row.id_phong_ban) : CHUONG_TRINH_STATS_PHONG_BAN_NONE;
    const label =
      (row.ten_phong_ban ?? '').trim() ||
      (id === CHUONG_TRINH_STATS_PHONG_BAN_NONE ? '—' : id);
    const prev = tally.get(id);
    if (prev) prev.count += 1;
    else tally.set(id, { label, count: 1 });
  }
  const rows = [...tally.entries()]
    .map(([rid, v]) => ({ id: rid, label: v.label, value: v.count }))
    .sort((a, b) => b.value - a.value);
  return rows.slice(0, topN);
}

export function aggregateChuongTrinhTopNamBatDau(filtered: ChuongTrinhNamListRow[], topN: number): LabelCountRow[] {
  const tally = new Map<string, { label: string; count: number }>();
  for (const row of filtered) {
    const y = yearFromNgayBatDau(row.ngay_bat_dau);
    if (!y) continue;
    const prev = tally.get(y);
    if (prev) prev.count += 1;
    else tally.set(y, { label: y, count: 1 });
  }
  const rows = [...tally.entries()]
    .map(([rid, v]) => ({ id: rid, label: v.label, value: v.count }))
    .sort((a, b) => b.value - a.value);
  return rows.slice(0, topN);
}

export function buildChuongTrinhTrangThaiBarData(filtered: ChuongTrinhNamListRow[]): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const s of CHUONG_TRINH_NAM_TRANG_THAI) map.set(s, 0);
  for (const r of filtered) {
    if (!CHUONG_TRINH_NAM_TRANG_THAI.includes(r.trang_thai)) continue;
    map.set(r.trang_thai, (map.get(r.trang_thai) ?? 0) + 1);
  }
  return CHUONG_TRINH_NAM_TRANG_THAI.map((label) => ({ label, count: map.get(label) ?? 0 }));
}

export type ChuongTrinhLookupSortKey =
  | 'ten_chuong_trinh'
  | 'ten_phong_ban'
  | 'trang_thai'
  | 'ngay_bat_dau'
  | 'ngay_ket_thuc'
  | 'nguoi_tao';

export function sortChuongTrinhLookupRows(
  rows: ChuongTrinhNamListRow[],
  sortKey: ChuongTrinhLookupSortKey,
  direction: 'asc' | 'desc',
  getLanguage: () => string,
): ChuongTrinhNamListRow[] {
  const dir = direction === 'asc' ? 1 : -1;
  const sorted = [...rows];
  const nguoi = (r: ChuongTrinhNamListRow) =>
    (r.ho_va_ten_nguoi_tao ?? r.ten_tai_khoan_nguoi_tao ?? '').trim();
  sorted.sort((a, b) => {
    let cmp: number;
    switch (sortKey) {
      case 'ten_phong_ban':
        cmp = String(a.ten_phong_ban ?? '').localeCompare(String(b.ten_phong_ban ?? ''), getLanguage());
        break;
      case 'trang_thai':
        cmp = String(a.trang_thai).localeCompare(String(b.trang_thai), getLanguage());
        break;
      case 'ngay_bat_dau':
        cmp = String(a.ngay_bat_dau ?? '').localeCompare(String(b.ngay_bat_dau ?? ''), getLanguage());
        break;
      case 'ngay_ket_thuc':
        cmp = String(a.ngay_ket_thuc ?? '').localeCompare(String(b.ngay_ket_thuc ?? ''), getLanguage());
        break;
      case 'nguoi_tao':
        cmp = nguoi(a).localeCompare(nguoi(b), getLanguage());
        break;
      default:
        cmp = String(a.ten_chuong_trinh).localeCompare(String(b.ten_chuong_trinh), getLanguage());
    }
    return cmp * dir;
  });
  return sorted;
}
