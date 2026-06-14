import dayjs from 'dayjs';
import type { ThamHoiToChuc } from '../../tham-hoi-to-chuc/core/types';
import { formatDonViThamHoiDisplay as formatDonViThamHoiToChucDisplay } from '../../tham-hoi-to-chuc/core/display-don-vi';
import { TIEN_DO_VALUES } from '../../tham-hoi-to-chuc/core/constants';
import type { ThamHoiCaNhan } from '../../tham-hoi-ca-nhan/core/types';
import { formatDonViThamHoiDisplay } from '../../tham-hoi-ca-nhan/core/display-don-vi';
import {
  isDateInStandardRange,
  resolveStandardDateRange,
  type StandardResolvedDateRange,
} from '@/lib/date-range-presets';

export const THAM_HOI_THONG_KE_LOAI = ['to_chuc', 'ca_nhan'] as const;
export type ThamHoiThongKeLoai = (typeof THAM_HOI_THONG_KE_LOAI)[number];

export const TINH_TRANG_THAM_HOI_VALUES = TIEN_DO_VALUES;
export type TinhTrangThamHoi = (typeof TINH_TRANG_THAM_HOI_VALUES)[number];

export interface ThamHoiThongKeRow {
  id: string;
  loai: ThamHoiThongKeLoai;
  ten_doi_tuong: string | null;
  loai_hinh: string | null;
  dip_tham_hoi_id: string | null;
  dip_tham_hoi: string;
  don_vi_tham_hoi: string | null;
  tinh_trang: TinhTrangThamHoi;
  thoi_gian_du_kien: string | null;
  thoi_gian_thuc_te: string | null;
  tg_tao: string;
}

export interface ThamHoiThongKeDimensionFilters {
  loai: string[];
  tinh_trang: string[];
  dip_tham_hoi: string[];
}

export type ResolvedDateRange = StandardResolvedDateRange;

export function resolveThamHoiThongKeDateRange(
  preset: string,
  customStart: string,
  customEnd: string,
  now: Date = new Date(),
): ResolvedDateRange {
  return resolveStandardDateRange(preset, customStart, customEnd, now);
}

export function getThamHoiStatsDateFromRow(row: ThamHoiThongKeRow): string {
  if (row.thoi_gian_du_kien?.trim()) return row.thoi_gian_du_kien.trim().slice(0, 10);
  if (row.tg_tao) return dayjs(row.tg_tao).format('YYYY-MM-DD');
  return '';
}

export function resolveThamHoiThongKeTrendChartRange(
  range: ResolvedDateRange,
  items: ThamHoiThongKeRow[],
): ResolvedDateRange {
  if (!range.allTime) {
    return { start: range.start, end: range.end };
  }
  let min = '';
  let max = '';
  for (const item of items) {
    const d = getThamHoiStatsDateFromRow(item);
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

function normalizeToChucRow(row: ThamHoiToChuc): ThamHoiThongKeRow {
  return {
    id: `tc-${row.id}`,
    loai: 'to_chuc',
    ten_doi_tuong: row.ten_co_so?.trim() || null,
    loai_hinh: row.loai_hinh?.trim() || null,
    dip_tham_hoi_id: row.dip_tham_hoi_id?.trim() || null,
    dip_tham_hoi: row.dip_tham_hoi?.trim() || row.ten_dip_tham_hoi?.trim() || '—',
    don_vi_tham_hoi: formatDonViThamHoiToChucDisplay(row),
    tinh_trang: (TINH_TRANG_THAM_HOI_VALUES.includes(row.tien_do as TinhTrangThamHoi)
      ? row.tien_do
      : 'Chưa thực hiện') as TinhTrangThamHoi,
    thoi_gian_du_kien: row.thoi_gian_du_kien?.trim() || null,
    thoi_gian_thuc_te: row.thoi_gian_thuc_te?.trim() || null,
    tg_tao: row.tg_tao,
  };
}

function normalizeCaNhanRow(row: ThamHoiCaNhan): ThamHoiThongKeRow {
  return {
    id: `cn-${row.id}`,
    loai: 'ca_nhan',
    ten_doi_tuong: row.ho_va_ten?.trim() || null,
    loai_hinh: null,
    dip_tham_hoi_id: row.dip_tham_hoi_id?.trim() || null,
    dip_tham_hoi: row.dip_tham_hoi?.trim() || row.ten_dip_tham_hoi?.trim() || '—',
    don_vi_tham_hoi: formatDonViThamHoiDisplay(row),
    tinh_trang: (TINH_TRANG_THAM_HOI_VALUES.includes(row.trang_thai as TinhTrangThamHoi)
      ? row.trang_thai
      : 'Chưa thực hiện') as TinhTrangThamHoi,
    thoi_gian_du_kien: row.thoi_gian_du_kien?.trim() || null,
    thoi_gian_thuc_te: row.thoi_gian_thuc_te?.trim() || null,
    tg_tao: row.tg_tao,
  };
}

export function combineAndNormalize(
  toChucRows: ThamHoiToChuc[],
  caNhanRows: ThamHoiCaNhan[],
): ThamHoiThongKeRow[] {
  return [
    ...toChucRows.map(normalizeToChucRow),
    ...caNhanRows.map(normalizeCaNhanRow),
  ];
}

export function filterRowsForThamHoiThongKe(
  items: ThamHoiThongKeRow[],
  range: ResolvedDateRange,
  dims: ThamHoiThongKeDimensionFilters,
): ThamHoiThongKeRow[] {
  return items.filter((row) => {
    if (!range.allTime) {
      const d = getThamHoiStatsDateFromRow(row);
      if (!isDateInStandardRange(d, range)) return false;
    }
    if (dims.loai.length > 0 && !dims.loai.includes(row.loai)) return false;
    if (dims.tinh_trang.length > 0 && !dims.tinh_trang.includes(row.tinh_trang)) return false;
    if (dims.dip_tham_hoi.length > 0) {
      const dipKey = row.dip_tham_hoi_id ?? row.dip_tham_hoi;
      if (!dims.dip_tham_hoi.includes(dipKey)) return false;
    }
    return true;
  });
}

export interface ThamHoiThongKeKpis {
  total: number;
  toChuc: number;
  caNhan: number;
  hoanThanh: number;
  dangThucHien: number;
  chuaThucHien: number;
}

export function computeThamHoiThongKeKpis(filtered: ThamHoiThongKeRow[]): ThamHoiThongKeKpis {
  let toChuc = 0;
  let caNhan = 0;
  let hoanThanh = 0;
  let dangThucHien = 0;
  let chuaThucHien = 0;

  for (const r of filtered) {
    if (r.loai === 'to_chuc') toChuc += 1;
    else caNhan += 1;
    if (r.tinh_trang === 'Đã hoàn thành') hoanThanh += 1;
    else if (r.tinh_trang === 'Đang thực hiện') dangThucHien += 1;
    else chuaThucHien += 1;
  }

  return {
    total: filtered.length,
    toChuc,
    caNhan,
    hoanThanh,
    dangThucHien,
    chuaThucHien,
  };
}

function aggregateByField(
  filtered: ThamHoiThongKeRow[],
  values: readonly string[],
  pick: (r: ThamHoiThongKeRow) => string,
): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, 0);
  for (const r of filtered) {
    const key = pick(r);
    if (!values.includes(key)) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return values.map((label) => ({ label, count: map.get(label) ?? 0 }));
}

export function buildTinhTrangBarData(filtered: ThamHoiThongKeRow[]) {
  return aggregateByField(filtered, TINH_TRANG_THAM_HOI_VALUES, (r) => r.tinh_trang);
}

export function buildLoaiBarData(
  filtered: ThamHoiThongKeRow[],
  labelOf: (loai: ThamHoiThongKeLoai) => string,
) {
  const counts = { to_chuc: 0, ca_nhan: 0 };
  for (const r of filtered) {
    counts[r.loai] += 1;
  }
  return THAM_HOI_THONG_KE_LOAI.map((loai) => ({
    label: labelOf(loai),
    count: counts[loai],
  }));
}

export interface LabelCountRow {
  id: string;
  label: string;
  value: number;
}

export function buildDipThamHoiBarData(filtered: ThamHoiThongKeRow[], topN = 10): LabelCountRow[] {
  const tally = new Map<string, number>();
  for (const row of filtered) {
    const key = row.dip_tham_hoi?.trim() || '—';
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return [...tally.entries()]
    .map(([label, value]) => ({ id: label, label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, topN);
}

export type ThamHoiTrendBucket = 'day' | 'month';

export function pickThamHoiTrendBucket(start: string, end: string): ThamHoiTrendBucket {
  const a = dayjs(start.slice(0, 10));
  const b = dayjs(end.slice(0, 10));
  const days = b.diff(a, 'day');
  return days > 62 ? 'month' : 'day';
}

export interface ThamHoiTrendPoint {
  key: string;
  label: string;
  count: number;
}

export function buildTrendSeries(
  filtered: ThamHoiThongKeRow[],
  range: ResolvedDateRange,
  bucket: ThamHoiTrendBucket,
): ThamHoiTrendPoint[] {
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
  for (const k of keys) map.set(k, 0);

  for (const item of filtered) {
    const raw = getThamHoiStatsDateFromRow(item);
    if (!raw) continue;
    const key = bucket === 'day' ? raw.slice(0, 10) : raw.slice(0, 7);
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

export type ThamHoiLookupSortKey =
  | 'ten_doi_tuong'
  | 'loai'
  | 'dip_tham_hoi'
  | 'don_vi_tham_hoi'
  | 'tinh_trang'
  | 'thoi_gian_du_kien'
  | 'thoi_gian_thuc_te'
  | 'tg_tao';

export function sortLookupRows(
  rows: ThamHoiThongKeRow[],
  sortKey: ThamHoiLookupSortKey,
  direction: 'asc' | 'desc',
  getLanguage: () => string,
): ThamHoiThongKeRow[] {
  const dir = direction === 'asc' ? 1 : -1;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let cmp: number;
    switch (sortKey) {
      case 'loai':
        cmp = a.loai.localeCompare(b.loai, getLanguage());
        break;
      case 'dip_tham_hoi':
        cmp = a.dip_tham_hoi.localeCompare(b.dip_tham_hoi, getLanguage());
        break;
      case 'don_vi_tham_hoi':
        cmp = String(a.don_vi_tham_hoi ?? '').localeCompare(String(b.don_vi_tham_hoi ?? ''), getLanguage());
        break;
      case 'tinh_trang':
        cmp = a.tinh_trang.localeCompare(b.tinh_trang, getLanguage());
        break;
      case 'thoi_gian_du_kien':
        cmp = String(a.thoi_gian_du_kien ?? '').localeCompare(String(b.thoi_gian_du_kien ?? ''), getLanguage());
        break;
      case 'thoi_gian_thuc_te':
        cmp = String(a.thoi_gian_thuc_te ?? '').localeCompare(String(b.thoi_gian_thuc_te ?? ''), getLanguage());
        break;
      case 'tg_tao':
        cmp = a.tg_tao.localeCompare(b.tg_tao, getLanguage());
        break;
      default:
        cmp = String(a.ten_doi_tuong ?? '').localeCompare(String(b.ten_doi_tuong ?? ''), getLanguage());
    }
    return cmp * dir;
  });
  return sorted;
}

export function formatLoaiLabel(
  loai: ThamHoiThongKeLoai,
  labelToChuc: string,
  labelCaNhan: string,
): string {
  return loai === 'to_chuc' ? labelToChuc : labelCaNhan;
}

export interface ThamHoiByYearRow {
  year: string;
  label: string;
  soDot: number;
  tongLuot: number;
  toChuc: number;
  caNhan: number;
  hoanThanh: number;
  dangThucHien: number;
  chuaThucHien: number;
}

function getThamHoiRowYear(row: ThamHoiThongKeRow): string | null {
  const d = getThamHoiStatsDateFromRow(row);
  if (!d || d.length < 4) return null;
  const year = d.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : null;
}

function getDipKey(row: ThamHoiThongKeRow): string {
  return row.dip_tham_hoi_id?.trim() || row.dip_tham_hoi?.trim() || '—';
}

export function buildByYearStats(filtered: ThamHoiThongKeRow[]): ThamHoiByYearRow[] {
  const buckets = new Map<
    string,
    {
      dipIds: Set<string>;
      tongLuot: number;
      toChuc: number;
      caNhan: number;
      hoanThanh: number;
      dangThucHien: number;
      chuaThucHien: number;
    }
  >();

  for (const row of filtered) {
    const year = getThamHoiRowYear(row);
    if (!year) continue;

    let bucket = buckets.get(year);
    if (!bucket) {
      bucket = {
        dipIds: new Set<string>(),
        tongLuot: 0,
        toChuc: 0,
        caNhan: 0,
        hoanThanh: 0,
        dangThucHien: 0,
        chuaThucHien: 0,
      };
      buckets.set(year, bucket);
    }

    bucket.dipIds.add(getDipKey(row));
    bucket.tongLuot += 1;
    if (row.loai === 'to_chuc') bucket.toChuc += 1;
    else bucket.caNhan += 1;
    if (row.tinh_trang === 'Đã hoàn thành') bucket.hoanThanh += 1;
    else if (row.tinh_trang === 'Đang thực hiện') bucket.dangThucHien += 1;
    else bucket.chuaThucHien += 1;
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, b]) => ({
      year,
      label: year,
      soDot: b.dipIds.size,
      tongLuot: b.tongLuot,
      toChuc: b.toChuc,
      caNhan: b.caNhan,
      hoanThanh: b.hoanThanh,
      dangThucHien: b.dangThucHien,
      chuaThucHien: b.chuaThucHien,
    }));
}

export function buildByYearChartData(rows: ThamHoiByYearRow[]) {
  return rows.map((r) => ({
    label: r.label,
    soDot: r.soDot,
    tongLuot: r.tongLuot,
  }));
}
