import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { BaiVietDanhSach } from '../../bai-viet/core/types';

dayjs.extend(isoWeek);

export interface ArticleStatsDimensionFilters {
  idTheLoai: string[];
  idNguonDang: string[];
  idTrangDang: string[];
  idNguoiTao: string[];
}

export interface ResolvedDateRange {
  start: string;
  end: string;
}

export const ARTICLE_STATS_PRESET_IDS = [
  'thisWeek',
  'thisMonth',
  'thisQuarter',
  'thisYear',
  'custom',
] as const;

export type ArticleStatsPresetId = (typeof ARTICLE_STATS_PRESET_IDS)[number];

/** Khoảng ngày đóng [start, end] YYYY-MM-DD theo preset (custom lấy từ form). */
export function resolveArticleStatsDateRange(
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

/** Ngày YYYY-MM-DD cho lọc & biểu đồ — luôn theo `tg_tao` (ngày tạo). */
export function getArticleStatsDateFromCreatedAt(item: BaiVietDanhSach): string {
  const raw = item.tg_tao;
  if (!raw) return '';
  return dayjs(raw).format('YYYY-MM-DD');
}

export function isDateInRange(dateStr: string, start: string, end: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= start.slice(0, 10) && d <= end.slice(0, 10);
}

export function filterArticlesForStats(
  items: BaiVietDanhSach[],
  range: ResolvedDateRange,
  dims: ArticleStatsDimensionFilters,
): BaiVietDanhSach[] {
  return items.filter((item) => {
    const d = getArticleStatsDateFromCreatedAt(item);
    if (!isDateInRange(d, range.start, range.end)) return false;
    if (dims.idTheLoai.length > 0 && !dims.idTheLoai.includes(String(item.id_the_loai))) return false;
    if (dims.idNguonDang.length > 0 && !dims.idNguonDang.includes(String(item.id_nguon_dang))) return false;
    if (dims.idTrangDang.length > 0 && !dims.idTrangDang.includes(String(item.id_trang_dang))) return false;
    if (dims.idNguoiTao.length > 0 && !dims.idNguoiTao.includes(String(item.id_nguoi_tao))) return false;
    return true;
  });
}

export function computeArticleStatsKpis(filtered: BaiVietDanhSach[]): {
  totalCount: number;
  totalDonGia: number;
  avgDonGia: number;
  distinctTheLoai: number;
  distinctNguoiTao: number;
} {
  const totalCount = filtered.length;
  let totalDonGia = 0;
  const theLoai = new Set<string>();
  const nguoi = new Set<string>();
  for (const r of filtered) {
    totalDonGia += Number(r.don_gia) || 0;
    theLoai.add(String(r.id_the_loai));
    nguoi.add(String(r.id_nguoi_tao));
  }
  const avgDonGia = totalCount > 0 ? totalDonGia / totalCount : 0;
  return {
    totalCount,
    totalDonGia,
    avgDonGia,
    distinctTheLoai: theLoai.size,
    distinctNguoiTao: nguoi.size,
  };
}

export type TrendBucket = 'day' | 'month';

export function pickTrendBucket(start: string, end: string): TrendBucket {
  const a = dayjs(start.slice(0, 10));
  const b = dayjs(end.slice(0, 10));
  const days = b.diff(a, 'day');
  return days > 62 ? 'month' : 'day';
}

export interface TrendPoint {
  key: string;
  label: string;
  count: number;
  totalDonGia: number;
}

/** Chuỗi bucket liên tục trong [start,end], gộp theo ngày hoặc tháng (YYYY-MM). */
export function buildTrendSeries(
  filtered: BaiVietDanhSach[],
  range: ResolvedDateRange,
  bucket: TrendBucket,
): TrendPoint[] {
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

  const map = new Map<string, { count: number; totalDonGia: number }>();
  for (const k of keys) {
    map.set(k, { count: 0, totalDonGia: 0 });
  }

  for (const item of filtered) {
    const d = getArticleStatsDateFromCreatedAt(item);
    if (!d) continue;
    const key = bucket === 'day' ? d.slice(0, 10) : d.slice(0, 7);
    if (!map.has(key)) continue;
    const cell = map.get(key)!;
    cell.count += 1;
    cell.totalDonGia += Number(item.don_gia) || 0;
  }

  return keys.map((key) => {
    const cell = map.get(key)!;
    const label =
      bucket === 'day' ? dayjs(key).format('DD/MM') : dayjs(key + '-01').format('MM/YYYY');
    return { key, label, count: cell.count, totalDonGia: cell.totalDonGia };
  });
}

export interface LabelCountRow {
  id: string;
  label: string;
  value: number;
}

export function aggregateTopCounts(
  filtered: BaiVietDanhSach[],
  mode: 'the_loai' | 'nguon' | 'trang' | 'nguoi_tao',
  topN: number,
): LabelCountRow[] {
  const tally = new Map<string, { label: string; count: number }>();
  for (const item of filtered) {
    let id: string;
    let label: string;
    switch (mode) {
      case 'the_loai':
        id = String(item.id_the_loai);
        label = item.ten_the_loai?.trim() || id;
        break;
      case 'nguon':
        id = String(item.id_nguon_dang);
        label = item.ten_nguon_dang?.trim() || id;
        break;
      case 'trang':
        id = String(item.id_trang_dang);
        label = item.ten_trang_dang?.trim() || id;
        break;
      case 'nguoi_tao':
        id = String(item.id_nguoi_tao);
        label =
          item.ho_va_ten_nguoi_tao?.trim() ||
          item.ten_tai_khoan_nguoi_tao?.trim() ||
          id;
        break;
      default:
        id = '';
        label = '';
    }
    const prev = tally.get(id);
    if (prev) prev.count += 1;
    else tally.set(id, { label, count: 1 });
  }
  const rows = [...tally.entries()]
    .map(([id, v]) => ({ id, label: v.label, value: v.count }))
    .sort((a, b) => b.value - a.value);
  return rows.slice(0, topN);
}

export type LookupSortKey =
  | 'ten_bai'
  | 'ngay_dang'
  | 'don_gia'
  | 'ten_the_loai'
  | 'ten_nguon_dang'
  | 'ten_trang_dang'
  | 'creator';

export function sortLookupRows(
  rows: BaiVietDanhSach[],
  sortKey: LookupSortKey,
  direction: 'asc' | 'desc',
): BaiVietDanhSach[] {
  const dir = direction === 'asc' ? 1 : -1;
  const creator = (r: BaiVietDanhSach) =>
    r.ho_va_ten_nguoi_tao?.trim() || r.ten_tai_khoan_nguoi_tao?.trim() || '';
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let cmp: number;
    switch (sortKey) {
      case 'don_gia':
        cmp = (Number(a.don_gia) || 0) - (Number(b.don_gia) || 0);
        break;
      case 'ngay_dang':
        cmp = String(a.ngay_dang).localeCompare(String(b.ngay_dang));
        break;
      case 'ten_the_loai':
        cmp = String(a.ten_the_loai ?? '').localeCompare(String(b.ten_the_loai ?? ''));
        break;
      case 'ten_nguon_dang':
        cmp = String(a.ten_nguon_dang ?? '').localeCompare(String(b.ten_nguon_dang ?? ''));
        break;
      case 'ten_trang_dang':
        cmp = String(a.ten_trang_dang ?? '').localeCompare(String(b.ten_trang_dang ?? ''));
        break;
      case 'creator':
        cmp = creator(a).localeCompare(creator(b));
        break;
      default:
        cmp = String(a.ten_bai).localeCompare(String(b.ten_bai));
    }
    return cmp * dir;
  });
  return sorted;
}
