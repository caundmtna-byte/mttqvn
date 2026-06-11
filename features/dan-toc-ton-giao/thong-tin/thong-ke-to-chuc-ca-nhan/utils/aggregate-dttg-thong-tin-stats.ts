import dayjs from 'dayjs';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';
import type { ThongTinToChucQuanTrong } from '../../thong-tin-to-chuc-quan-trong/core/types';
import { LOAI_HINH_VALUES } from '../../thong-tin-to-chuc-quan-trong/core/constants';
import type { ThongTinCaNhanTieuBieu } from '../../thong-tin-ca-nhan-tieu-bieu/core/types';
import { DOI_TUONG_VALUES } from '../../thong-tin-ca-nhan-tieu-bieu/core/constants';
import {
  isDateInStandardRange,
  resolveStandardDateRange,
  type StandardResolvedDateRange,
} from '@/lib/date-range-presets';

export const DTTG_THONG_TIN_LOAI = ['to_chuc', 'ca_nhan'] as const;
export type DttgThongTinLoai = (typeof DTTG_THONG_TIN_LOAI)[number];

export const DTTG_STATS_DON_VI_NONE = '__none__';

export interface DttgThongTinThongKeRow {
  id: string;
  loai: DttgThongTinLoai;
  ten: string;
  phan_loai: string;
  don_vi_id: string | null;
  ten_don_vi: string | null;
  ten_tinh: string | null;
  trang_thai: TrangThaiHoatDong;
  tg_tao: string;
  source_id: string;
}

export interface DttgThongTinDimensionFilters {
  loai: string[];
  trang_thai: string[];
  loai_hinh: string[];
  doi_tuong: string[];
  don_vi_id: string[];
}

export type ResolvedDateRange = StandardResolvedDateRange;

export function resolveDttgThongTinDateRange(
  preset: string,
  customStart: string,
  customEnd: string,
  now: Date = new Date(),
): ResolvedDateRange {
  return resolveStandardDateRange(preset, customStart, customEnd, now);
}

export function getDttgThongTinStatsDateFromRow(row: DttgThongTinThongKeRow): string {
  if (row.tg_tao) return dayjs(row.tg_tao).format('YYYY-MM-DD');
  return '';
}

export function resolveDttgThongTinTrendChartRange(
  range: ResolvedDateRange,
  items: DttgThongTinThongKeRow[],
): ResolvedDateRange {
  if (!range.allTime) {
    return { start: range.start, end: range.end };
  }
  let min = '';
  let max = '';
  for (const item of items) {
    const d = getDttgThongTinStatsDateFromRow(item);
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

export function formatDonViLabel(row: Pick<DttgThongTinThongKeRow, 'ten_don_vi' | 'ten_tinh'>): string {
  const dv = row.ten_don_vi?.trim();
  const tinh = row.ten_tinh?.trim();
  if (dv && tinh) return `${dv}, ${tinh}`;
  return dv || tinh || '—';
}

function normalizeToChucRow(row: ThongTinToChucQuanTrong): DttgThongTinThongKeRow {
  const trangThai = TRANG_THAI_HOAT_DONG.includes(row.trang_thai as TrangThaiHoatDong)
    ? row.trang_thai
    : 'Đang hoạt động';
  return {
    id: `tc-${row.id}`,
    loai: 'to_chuc',
    ten: row.ten_co_so?.trim() || '—',
    phan_loai: row.loai_hinh?.trim() || '—',
    don_vi_id: row.don_vi_id?.trim() ? String(row.don_vi_id) : null,
    ten_don_vi: row.ten_don_vi?.trim() || null,
    ten_tinh: row.ten_tinh?.trim() || null,
    trang_thai: trangThai,
    tg_tao: row.tg_tao,
    source_id: row.id,
  };
}

function normalizeCaNhanRow(row: ThongTinCaNhanTieuBieu): DttgThongTinThongKeRow {
  const trangThai = TRANG_THAI_HOAT_DONG.includes(row.trang_thai as TrangThaiHoatDong)
    ? row.trang_thai
    : 'Đang hoạt động';
  return {
    id: `cn-${row.id}`,
    loai: 'ca_nhan',
    ten: row.ho_va_ten?.trim() || '—',
    phan_loai: row.doi_tuong?.trim() || '—',
    don_vi_id: row.don_vi_id?.trim() ? String(row.don_vi_id) : null,
    ten_don_vi: row.ten_don_vi?.trim() || null,
    ten_tinh: row.ten_tinh?.trim() || null,
    trang_thai: trangThai,
    tg_tao: row.tg_tao,
    source_id: row.id,
  };
}

export function combineAndNormalize(
  toChucRows: ThongTinToChucQuanTrong[],
  caNhanRows: ThongTinCaNhanTieuBieu[],
): DttgThongTinThongKeRow[] {
  return [...toChucRows.map(normalizeToChucRow), ...caNhanRows.map(normalizeCaNhanRow)];
}

export function filterRowsForDttgThongTin(
  items: DttgThongTinThongKeRow[],
  range: ResolvedDateRange,
  dims: DttgThongTinDimensionFilters,
): DttgThongTinThongKeRow[] {
  return items.filter((row) => {
    if (!range.allTime) {
      const d = getDttgThongTinStatsDateFromRow(row);
      if (!isDateInStandardRange(d, range)) return false;
    }
    if (dims.loai.length > 0 && !dims.loai.includes(row.loai)) return false;
    if (dims.trang_thai.length > 0 && !dims.trang_thai.includes(row.trang_thai)) return false;
    if (dims.loai_hinh.length > 0) {
      if (row.loai !== 'to_chuc' || !dims.loai_hinh.includes(row.phan_loai)) return false;
    }
    if (dims.doi_tuong.length > 0) {
      if (row.loai !== 'ca_nhan' || !dims.doi_tuong.includes(row.phan_loai)) return false;
    }
    if (dims.don_vi_id.length > 0) {
      const id = row.don_vi_id?.trim() ? String(row.don_vi_id) : DTTG_STATS_DON_VI_NONE;
      if (!dims.don_vi_id.includes(id)) return false;
    }
    return true;
  });
}

export interface DttgThongTinKpis {
  total: number;
  toChuc: number;
  caNhan: number;
  dangHoatDong: number;
  ngungHoatDong: number;
}

export function computeDttgThongTinKpis(filtered: DttgThongTinThongKeRow[]): DttgThongTinKpis {
  let toChuc = 0;
  let caNhan = 0;
  let dangHoatDong = 0;
  let ngungHoatDong = 0;

  for (const r of filtered) {
    if (r.loai === 'to_chuc') toChuc += 1;
    else caNhan += 1;
    if (r.trang_thai === 'Đang hoạt động') dangHoatDong += 1;
    else ngungHoatDong += 1;
  }

  return {
    total: filtered.length,
    toChuc,
    caNhan,
    dangHoatDong,
    ngungHoatDong,
  };
}

function aggregateByField(
  filtered: DttgThongTinThongKeRow[],
  values: readonly string[],
  pick: (r: DttgThongTinThongKeRow) => string,
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

export function buildTrangThaiBarData(filtered: DttgThongTinThongKeRow[]) {
  return aggregateByField(filtered, TRANG_THAI_HOAT_DONG, (r) => r.trang_thai);
}

export function buildLoaiBarData(
  filtered: DttgThongTinThongKeRow[],
  labelOf: (loai: DttgThongTinLoai) => string,
) {
  const counts = { to_chuc: 0, ca_nhan: 0 };
  for (const r of filtered) {
    counts[r.loai] += 1;
  }
  return DTTG_THONG_TIN_LOAI.map((loai) => ({
    label: labelOf(loai),
    count: counts[loai],
  }));
}

export function buildLoaiHinhBarData(filtered: DttgThongTinThongKeRow[]) {
  return aggregateByField(
    filtered.filter((r) => r.loai === 'to_chuc'),
    LOAI_HINH_VALUES,
    (r) => r.phan_loai,
  );
}

export function buildDoiTuongBarData(filtered: DttgThongTinThongKeRow[]) {
  return aggregateByField(
    filtered.filter((r) => r.loai === 'ca_nhan'),
    DOI_TUONG_VALUES,
    (r) => r.phan_loai,
  );
}

export interface DttgDonViTableRow {
  id: string;
  label: string;
  toChuc: number;
  caNhan: number;
  total: number;
}

export function aggregateByDonViTable(filtered: DttgThongTinThongKeRow[]): DttgDonViTableRow[] {
  const tally = new Map<string, { label: string; toChuc: number; caNhan: number }>();

  for (const row of filtered) {
    const id = row.don_vi_id?.trim() ? String(row.don_vi_id) : DTTG_STATS_DON_VI_NONE;
    const label = formatDonViLabel(row);
    const prev = tally.get(id);
    if (prev) {
      if (row.loai === 'to_chuc') prev.toChuc += 1;
      else prev.caNhan += 1;
    } else {
      tally.set(id, {
        label,
        toChuc: row.loai === 'to_chuc' ? 1 : 0,
        caNhan: row.loai === 'ca_nhan' ? 1 : 0,
      });
    }
  }

  return [...tally.entries()]
    .map(([id, v]) => ({
      id,
      label: v.label,
      toChuc: v.toChuc,
      caNhan: v.caNhan,
      total: v.toChuc + v.caNhan,
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

export type DttgTrendBucket = 'day' | 'month';

export function pickDttgTrendBucket(start: string, end: string): DttgTrendBucket {
  const a = dayjs(start.slice(0, 10));
  const b = dayjs(end.slice(0, 10));
  const days = b.diff(a, 'day');
  return days > 62 ? 'month' : 'day';
}

export interface DttgTrendPoint {
  key: string;
  label: string;
  count: number;
}

export function buildTrendSeries(
  filtered: DttgThongTinThongKeRow[],
  range: ResolvedDateRange,
  bucket: DttgTrendBucket,
): DttgTrendPoint[] {
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
    const raw = getDttgThongTinStatsDateFromRow(item);
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

export type DttgLookupSortKey = 'ten' | 'loai' | 'phan_loai' | 'don_vi' | 'trang_thai' | 'tg_tao';

export function sortLookupRows(
  rows: DttgThongTinThongKeRow[],
  sortKey: DttgLookupSortKey,
  direction: 'asc' | 'desc',
  getLanguage: () => string,
): DttgThongTinThongKeRow[] {
  const dir = direction === 'asc' ? 1 : -1;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let cmp: number;
    switch (sortKey) {
      case 'loai':
        cmp = a.loai.localeCompare(b.loai, getLanguage());
        break;
      case 'phan_loai':
        cmp = a.phan_loai.localeCompare(b.phan_loai, getLanguage());
        break;
      case 'don_vi':
        cmp = formatDonViLabel(a).localeCompare(formatDonViLabel(b), getLanguage());
        break;
      case 'trang_thai':
        cmp = a.trang_thai.localeCompare(b.trang_thai, getLanguage());
        break;
      case 'tg_tao':
        cmp = a.tg_tao.localeCompare(b.tg_tao, getLanguage());
        break;
      default:
        cmp = a.ten.localeCompare(b.ten, getLanguage());
    }
    return cmp * dir;
  });
  return sorted;
}

export function formatLoaiLabel(
  loai: DttgThongTinLoai,
  labelToChuc: string,
  labelCaNhan: string,
): string {
  return loai === 'to_chuc' ? labelToChuc : labelCaNhan;
}

export function formatReportPeriodLabel(
  range: ResolvedDateRange,
  trendRange: ResolvedDateRange,
  allTimeLabel: string,
): string {
  if (range.allTime) {
    if (trendRange.start && trendRange.end) {
      return `${trendRange.start} — ${trendRange.end}`;
    }
    return allTimeLabel;
  }
  return `${range.start} — ${range.end}`;
}
