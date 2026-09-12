import dayjs from 'dayjs';
import type { BaiVietDanhSach } from '../../bai-viet/core/types';
import {
  isDateInStandardRange,
  resolveStandardDateRange,
  STANDARD_DATE_RANGE_PRESET_IDS,
  type StandardResolvedDateRange,
} from '@/lib/date-range-presets';

export interface ArticleStatsDimensionFilters {
  idTheLoai: string[];
  idNguonDang: string[];
  idTrangDang: string[];
  idNguoiTao: string[];
}

export type ResolvedDateRange = StandardResolvedDateRange;

export const ARTICLE_STATS_PRESET_IDS = STANDARD_DATE_RANGE_PRESET_IDS;

export type ArticleStatsPresetId = (typeof ARTICLE_STATS_PRESET_IDS)[number];

/** Khoảng ngày đóng [start, end] YYYY-MM-DD theo preset (custom lấy từ form). */
export function resolveArticleStatsDateRange(
  preset: string,
  customStart: string,
  customEnd: string,
  now: Date = new Date(),
): ResolvedDateRange {
  return resolveStandardDateRange(preset, customStart, customEnd, now);
}

/** Ngày YYYY-MM-DD cho lọc & biểu đồ — luôn theo `tg_tao` (ngày tạo). */
export function getArticleStatsDateFromCreatedAt(item: BaiVietDanhSach): string {
  const raw = item.tg_tao;
  if (!raw) return '';
  return dayjs(raw).format('YYYY-MM-DD');
}

export function isDateInRange(dateStr: string, range: ResolvedDateRange): boolean {
  return isDateInStandardRange(dateStr, range);
}

export function filterArticlesForStats(
  items: BaiVietDanhSach[],
  range: ResolvedDateRange,
  dims: ArticleStatsDimensionFilters,
): BaiVietDanhSach[] {
  return items.filter((item) => {
    const d = getArticleStatsDateFromCreatedAt(item);
    if (!range.allTime && !isDateInRange(d, range)) return false;
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
  if (!start || !end) return 'month';
  const a = dayjs(start.slice(0, 10));
  const b = dayjs(end.slice(0, 10));
  const days = b.diff(a, 'day');
  return !Number.isFinite(days) || days > 62 ? 'month' : 'day';
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
  let startStr = range.start;
  let endStr = range.end;

  // allTime hoặc empty start/end → tự suy min/max từ data để tránh vòng lặp vô tận
  if (!startStr || !endStr) {
    if (filtered.length === 0) return [];
    const dates = filtered.map(getArticleStatsDateFromCreatedAt).filter(Boolean);
    if (dates.length === 0) return [];
    startStr = dates.reduce((a, b) => (a < b ? a : b));
    endStr = dates.reduce((a, b) => (a > b ? a : b));
  }

  const start = dayjs(startStr.slice(0, 10));
  const end = dayjs(endStr.slice(0, 10));
  if (!start.isValid() || !end.isValid()) return [];
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

/* ------------------------------------------------------------------ *
 * Tổng hợp theo xã/phường
 *
 * Bài viết không có cột đơn vị riêng: đơn vị của bài = đơn vị (`don_vi_id`)
 * của NGƯỜI TẠO, lấy qua embed `nguoi_tao`. Tên xã tra từ danh mục
 * `var_ssn_xa_phuong` (cache 24h) thay vì embed thêm vào từng dòng bài viết —
 * embed lồng sẽ lặp lại tên xã cho hàng nghìn dòng, tốn egress vô ích.
 * ------------------------------------------------------------------ */

/** Khoá nhóm cho bài của người tạo chưa gắn đơn vị. */
export const ARTICLE_STATS_DON_VI_UNKNOWN = '__khong_xac_dinh__';

export interface DonViStatsRow {
  /** Id xã/phường, hoặc `ARTICLE_STATS_DON_VI_UNKNOWN` khi người tạo chưa gắn đơn vị. */
  id: string;
  label: string;
  soBai: number;
  tongDonGia: number;
  /** Đơn giá trung bình mỗi bài của xã (0 khi không có bài). */
  avgDonGia: number;
  /** Tỷ trọng số bài trên tổng số bài đã lọc, đơn vị % (0 khi không có bài nào). */
  tyTrongSoBai: number;
}

/**
 * Gộp bài viết theo xã/phường của người tạo.
 * Sắp giảm dần theo số bài → tổng đơn giá → tên; nhóm "chưa xác định" luôn ở cuối
 * để không chen giữa các xã thật trong bảng báo cáo.
 */
export function aggregateByDonVi(
  filtered: BaiVietDanhSach[],
  tenDonViById: ReadonlyMap<string, string>,
  unknownLabel: string,
): DonViStatsRow[] {
  const tally = new Map<string, { label: string; soBai: number; tongDonGia: number }>();

  for (const item of filtered) {
    const raw = item.id_don_vi_nguoi_tao;
    const id = raw != null && String(raw).trim() !== '' ? String(raw).trim() : ARTICLE_STATS_DON_VI_UNKNOWN;
    const label =
      id === ARTICLE_STATS_DON_VI_UNKNOWN ? unknownLabel : tenDonViById.get(id)?.trim() || id;
    const tien = Number(item.don_gia) || 0;
    const prev = tally.get(id);
    if (prev) {
      prev.soBai += 1;
      prev.tongDonGia += tien;
    } else {
      tally.set(id, { label, soBai: 1, tongDonGia: tien });
    }
  }

  const tongSoBai = filtered.length;
  const rows = [...tally.entries()].map(([id, v]) => ({
    id,
    label: v.label,
    soBai: v.soBai,
    tongDonGia: v.tongDonGia,
    avgDonGia: v.soBai > 0 ? v.tongDonGia / v.soBai : 0,
    tyTrongSoBai: tongSoBai > 0 ? (v.soBai * 100) / tongSoBai : 0,
  }));

  rows.sort((a, b) => {
    const aUnknown = a.id === ARTICLE_STATS_DON_VI_UNKNOWN;
    const bUnknown = b.id === ARTICLE_STATS_DON_VI_UNKNOWN;
    if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
    if (b.soBai !== a.soBai) return b.soBai - a.soBai;
    if (b.tongDonGia !== a.tongDonGia) return b.tongDonGia - a.tongDonGia;
    return a.label.localeCompare(b.label, 'vi');
  });

  return rows;
}
