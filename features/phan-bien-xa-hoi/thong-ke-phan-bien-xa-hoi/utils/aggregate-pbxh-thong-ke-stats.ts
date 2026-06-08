import dayjs from 'dayjs';
import type { ThucHienPhanBien } from '../../thuc-hien-phan-bien-xa-hoi/core/types';
import {
  isDateInStandardRange,
  resolveStandardDateRange,
  type StandardResolvedDateRange,
} from '@/lib/date-range-presets';
import {
  CAP_THUC_HIEN_VALUES,
  LOAI_HINH_VALUES,
  TINH_TRANG_VALUES,
} from '../../thuc-hien-phan-bien-xa-hoi/core/constants';
import { daysFromDeadline } from '@/features/quan-ly-giao-viec/cong-viec/utils/deadline-progress';
import { tinhTienDo } from '../../thuc-hien-phan-bien-xa-hoi/core/display-tien-do';

export const PBXH_STATS_DON_VI_NONE = '__none__';

export const PBXH_TIEN_DO_FILTER_IDS = ['qua_han', 'sap_den_han', 'con_han', 'khong_co_han'] as const;
export type PbxhTienDoFilterId = (typeof PBXH_TIEN_DO_FILTER_IDS)[number];

export const PBXH_SAP_DEN_HAN_MAX_DAYS = 7;

export interface PbxhThongKeDimensionFilters {
  cap_thuc_hien: string[];
  loai_hinh: string[];
  tinh_trang: string[];
  don_vi_chu_tri_id: string[];
  tien_do: string[];
}

export type ResolvedDateRange = StandardResolvedDateRange;

export function resolvePbxhThongKeDateRange(
  preset: string,
  customStart: string,
  customEnd: string,
  now: Date = new Date(),
): ResolvedDateRange {
  return resolveStandardDateRange(preset, customStart, customEnd, now);
}

/** Preset «Tất cả» → min–max ngày trên tập đã lọc dimension (trước khi lọc ngày). */
export function resolvePbxhThongKeTrendChartRange(
  range: ResolvedDateRange,
  items: ThucHienPhanBien[],
): ResolvedDateRange {
  if (!range.allTime) {
    return { start: range.start, end: range.end };
  }
  let min = '';
  let max = '';
  for (const item of items) {
    const d = getPbxhStatsDateFromRow(item);
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

export function getPbxhStatsDateFromRow(item: ThucHienPhanBien): string {
  if (item.ngay_bat_dau?.trim()) return item.ngay_bat_dau.trim().slice(0, 10);
  if (item.tg_tao) return dayjs(item.tg_tao).format('YYYY-MM-DD');
  return '';
}

export function isDateInPbxhRange(dateStr: string, range: ResolvedDateRange): boolean {
  return isDateInStandardRange(dateStr, range);
}

export function getPbxhTienDoFilterId(row: ThucHienPhanBien): PbxhTienDoFilterId {
  if (row.tinh_trang === 'Đã hoàn thành') return 'con_han';
  if (!row.ngay_ket_thuc?.trim()) return 'khong_co_han';
  const d = daysFromDeadline(row.ngay_ket_thuc);
  if (d == null) return 'khong_co_han';
  if (d < 0) return 'qua_han';
  if (d <= PBXH_SAP_DEN_HAN_MAX_DAYS) return 'sap_den_han';
  return 'con_han';
}

export function pbxhTienDoSortKey(row: ThucHienPhanBien): number {
  if (row.tinh_trang === 'Đã hoàn thành') return 300_000;
  const d = daysFromDeadline(row.ngay_ket_thuc);
  if (d == null) return 200_000;
  return d;
}

export function filterRowsForPbxhThongKe(
  items: ThucHienPhanBien[],
  range: ResolvedDateRange,
  dims: PbxhThongKeDimensionFilters,
): ThucHienPhanBien[] {
  return items.filter((row) => {
    if (!range.allTime) {
      const d = getPbxhStatsDateFromRow(row);
      if (!isDateInPbxhRange(d, range)) return false;
    }
    if (dims.cap_thuc_hien.length > 0 && !dims.cap_thuc_hien.includes(row.cap_thuc_hien)) return false;
    if (dims.loai_hinh.length > 0 && !dims.loai_hinh.includes(row.loai_hinh)) return false;
    if (dims.tinh_trang.length > 0 && !dims.tinh_trang.includes(row.tinh_trang)) return false;
    if (dims.don_vi_chu_tri_id.length > 0) {
      const id = row.don_vi_chu_tri_id?.trim() ? String(row.don_vi_chu_tri_id) : PBXH_STATS_DON_VI_NONE;
      if (!dims.don_vi_chu_tri_id.includes(id)) return false;
    }
    if (dims.tien_do.length > 0) {
      const td = getPbxhTienDoFilterId(row);
      if (!dims.tien_do.includes(td)) return false;
    }
    return true;
  });
}

export interface PbxhThongKeKpis {
  total: number;
  dangThucHien: number;
  hoanThanh: number;
  keHoachDuKien: number;
  quaHan: number;
  avgPhanTram: number;
}

export function computePbxhThongKeKpis(filtered: ThucHienPhanBien[]): PbxhThongKeKpis {
  let dangThucHien = 0;
  let hoanThanh = 0;
  let keHoachDuKien = 0;
  let quaHan = 0;
  let sumPhanTram = 0;

  for (const r of filtered) {
    if (r.tinh_trang === 'Đang thực hiện') dangThucHien += 1;
    else if (r.tinh_trang === 'Đã hoàn thành') hoanThanh += 1;
    else if (r.tinh_trang === 'Đã lập kế hoạch' || r.tinh_trang === 'Dự kiến') keHoachDuKien += 1;

    if (r.tinh_trang !== 'Đã hoàn thành') {
      const d = daysFromDeadline(r.ngay_ket_thuc);
      if (d != null && d < 0) quaHan += 1;
    }

    sumPhanTram += r.phan_tram_hoan_thanh ?? 0;
  }

  const total = filtered.length;
  const avgPhanTram = total > 0 ? Math.round(sumPhanTram / total) : 0;

  return { total, dangThucHien, hoanThanh, keHoachDuKien, quaHan, avgPhanTram };
}

export interface PbxhTienDoKpis {
  quaHan: number;
  sapDenHan: number;
  conHan: number;
  khongCoHan: number;
}

export function computePbxhTienDoKpis(filtered: ThucHienPhanBien[]): PbxhTienDoKpis {
  let quaHan = 0;
  let sapDenHan = 0;
  let conHan = 0;
  let khongCoHan = 0;
  for (const r of filtered) {
    const c = getPbxhTienDoFilterId(r);
    if (c === 'qua_han') quaHan += 1;
    else if (c === 'sap_den_han') sapDenHan += 1;
    else if (c === 'con_han') conHan += 1;
    else khongCoHan += 1;
  }
  return { quaHan, sapDenHan, conHan, khongCoHan };
}

export interface LabelCountRow {
  id: string;
  label: string;
  value: number;
}

function aggregateByField(
  filtered: ThucHienPhanBien[],
  values: readonly string[],
  pick: (r: ThucHienPhanBien) => string,
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

export function buildPbxhTinhTrangBarData(filtered: ThucHienPhanBien[]) {
  return aggregateByField(filtered, TINH_TRANG_VALUES, (r) => r.tinh_trang);
}

export function buildPbxhLoaiHinhBarData(filtered: ThucHienPhanBien[]) {
  return aggregateByField(filtered, LOAI_HINH_VALUES, (r) => r.loai_hinh);
}

export function buildPbxhCapThucHienBarData(filtered: ThucHienPhanBien[]) {
  return aggregateByField(filtered, CAP_THUC_HIEN_VALUES, (r) => r.cap_thuc_hien);
}

export function aggregatePbxhTopDonViChuTri(filtered: ThucHienPhanBien[], topN: number): LabelCountRow[] {
  const tally = new Map<string, { label: string; count: number }>();
  for (const row of filtered) {
    const id = row.don_vi_chu_tri_id?.trim() ? String(row.don_vi_chu_tri_id) : PBXH_STATS_DON_VI_NONE;
    const label = (row.ten_don_vi_chu_tri ?? '').trim() || '—';
    const prev = tally.get(id);
    if (prev) prev.count += 1;
    else tally.set(id, { label, count: 1 });
  }
  return [...tally.entries()]
    .map(([rid, v]) => ({ id: rid, label: v.label, value: v.count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

export interface PbxhDonViChuTriTableRow {
  id: string;
  label: string;
  total: number;
  dangThucHien: number;
  hoanThanh: number;
  avgPhanTram: number;
}

export function aggregatePbxhByDonViChuTriTable(filtered: ThucHienPhanBien[]): PbxhDonViChuTriTableRow[] {
  const tally = new Map<
    string,
    { label: string; total: number; dangThucHien: number; hoanThanh: number; sumPhanTram: number }
  >();

  for (const row of filtered) {
    const id = row.don_vi_chu_tri_id?.trim() ? String(row.don_vi_chu_tri_id) : PBXH_STATS_DON_VI_NONE;
    const label = (row.ten_don_vi_chu_tri ?? '').trim() || '—';
    const prev = tally.get(id);
    if (prev) {
      prev.total += 1;
      if (row.tinh_trang === 'Đang thực hiện') prev.dangThucHien += 1;
      if (row.tinh_trang === 'Đã hoàn thành') prev.hoanThanh += 1;
      prev.sumPhanTram += row.phan_tram_hoan_thanh ?? 0;
    } else {
      tally.set(id, {
        label,
        total: 1,
        dangThucHien: row.tinh_trang === 'Đang thực hiện' ? 1 : 0,
        hoanThanh: row.tinh_trang === 'Đã hoàn thành' ? 1 : 0,
        sumPhanTram: row.phan_tram_hoan_thanh ?? 0,
      });
    }
  }

  return [...tally.entries()]
    .map(([id, v]) => ({
      id,
      label: v.label,
      total: v.total,
      dangThucHien: v.dangThucHien,
      hoanThanh: v.hoanThanh,
      avgPhanTram: v.total > 0 ? Math.round(v.sumPhanTram / v.total) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function aggregatePbxhLoaiHinhMatrix(filtered: ThucHienPhanBien[]): LabelCountRow[] {
  const tally = new Map<string, number>();
  for (const row of filtered) {
    const key = `${row.loai_hinh} — ${row.tinh_trang}`;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return [...tally.entries()]
    .map(([label, value]) => ({ id: label, label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

export type PbxhTrendBucket = 'day' | 'month';

export function pickPbxhTrendBucket(start: string, end: string): PbxhTrendBucket {
  const a = dayjs(start.slice(0, 10));
  const b = dayjs(end.slice(0, 10));
  const days = b.diff(a, 'day');
  return days > 62 ? 'month' : 'day';
}

export interface PbxhTrendPoint {
  key: string;
  label: string;
  count: number;
}

export function buildPbxhTrendSeries(
  filtered: ThucHienPhanBien[],
  range: ResolvedDateRange,
  bucket: PbxhTrendBucket,
): PbxhTrendPoint[] {
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
    const raw = item.ngay_bat_dau?.trim() ? item.ngay_bat_dau.trim().slice(0, 10) : getPbxhStatsDateFromRow(item);
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

export type PbxhLookupSortKey =
  | 'noi_dung'
  | 'loai_hinh'
  | 'tinh_trang'
  | 'ten_don_vi_chu_tri'
  | 'tien_do'
  | 'phan_tram_hoan_thanh'
  | 'ngay_ket_thuc';

export function sortPbxhLookupRows(
  rows: ThucHienPhanBien[],
  sortKey: PbxhLookupSortKey,
  direction: 'asc' | 'desc',
  getLanguage: () => string,
): ThucHienPhanBien[] {
  const dir = direction === 'asc' ? 1 : -1;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let cmp: number;
    switch (sortKey) {
      case 'loai_hinh':
        cmp = String(a.loai_hinh).localeCompare(String(b.loai_hinh), getLanguage());
        break;
      case 'tinh_trang':
        cmp = String(a.tinh_trang).localeCompare(String(b.tinh_trang), getLanguage());
        break;
      case 'ten_don_vi_chu_tri':
        cmp = String(a.ten_don_vi_chu_tri ?? '').localeCompare(String(b.ten_don_vi_chu_tri ?? ''), getLanguage());
        break;
      case 'tien_do':
        cmp = pbxhTienDoSortKey(a) - pbxhTienDoSortKey(b);
        break;
      case 'phan_tram_hoan_thanh':
        cmp = (a.phan_tram_hoan_thanh ?? 0) - (b.phan_tram_hoan_thanh ?? 0);
        break;
      case 'ngay_ket_thuc':
        cmp = String(a.ngay_ket_thuc ?? '').localeCompare(String(b.ngay_ket_thuc ?? ''), getLanguage());
        break;
      default:
        cmp = String(a.noi_dung).localeCompare(String(b.noi_dung), getLanguage());
    }
    return cmp * dir;
  });
  return sorted;
}

export function formatPbxhTienDoLabel(row: ThucHienPhanBien): string {
  return tinhTienDo(row.ngay_ket_thuc) ?? row.mo_ta_thoi_gian ?? '—';
}
