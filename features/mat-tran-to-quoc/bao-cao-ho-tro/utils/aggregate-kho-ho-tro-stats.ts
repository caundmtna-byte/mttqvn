import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { NhapXuatKhoCtFlatRow } from '../../nhap-xuat-kho/core/types';
import type { NhapXuatKhoLoaiPhieu } from '../../nhap-xuat-kho/core/constants';
import { loaiPhieuLabel } from '../../nhap-xuat-kho/core/constants';
import type { TonKhoRecord } from '../../ton-kho/core/types';
import type {
  ReliefSupportDimensionFilters,
  ReliefSupportKpis,
  ReliefSupportLabelValueRow,
  ReliefSupportLookupRow,
  ReliefSupportLookupSortKey,
  ReliefSupportMasterMaps,
  ReliefSupportStatsResult,
  ReliefSupportTrendPoint,
  ResolvedReliefDateRange,
} from '../core/types';

dayjs.extend(isoWeek);

export const RELIEF_STATS_PRESET_IDS = [
  'all',
  'thisWeek',
  'thisMonth',
  'thisQuarter',
  'thisYear',
  'custom',
] as const;

export function resolveReliefStatsDateRange(
  preset: string,
  customStart: string,
  customEnd: string,
  now: Date = new Date(),
): ResolvedReliefDateRange {
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

function isDateInRange(dateStr: string, start: string, end: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= start.slice(0, 10) && d <= end.slice(0, 10);
}

function matchesMulti(selected: string[], value: string | null | undefined): boolean {
  if (selected.length === 0) return true;
  if (!value?.trim()) return false;
  return selected.includes(String(value));
}

function khoLabelForRow(row: NhapXuatKhoCtFlatRow): string {
  if (row.loai_phieu === 'nhap_ngoai') return row.ten_kho_nhap ?? '—';
  if (row.loai_phieu === 'xuat_ngoai') return row.ten_kho_xuat ?? '—';
  const from = row.ten_kho_xuat ?? '—';
  const to = row.ten_kho_nhap ?? '—';
  return `${from} → ${to}`;
}

function nguonDichLabelForRow(row: NhapXuatKhoCtFlatRow): string {
  if (row.loai_phieu === 'nhap_ngoai') return row.ten_don_vi_cuu_tro ?? '—';
  if (row.loai_phieu === 'xuat_ngoai') return row.ten_dot_cuu_tro ?? '—';
  return '—';
}

export function enrichFlatRow(
  row: NhapXuatKhoCtFlatRow,
  hangMap: ReliefSupportMasterMaps['hangMap'],
): ReliefSupportLookupRow {
  const h = hangMap[row.hang_hoa_id];
  return {
    ...row,
    loai_phieu_label: loaiPhieuLabel(row.loai_phieu),
    kho_label: khoLabelForRow(row),
    nguon_dich_label: nguonDichLabelForRow(row),
    ten_danh_muc: h?.ten_danh_muc_nhom ?? null,
  };
}

export function filterReliefSupportRows(
  lines: NhapXuatKhoCtFlatRow[],
  range: ResolvedReliefDateRange,
  dims: ReliefSupportDimensionFilters,
  hangMap: ReliefSupportMasterMaps['hangMap'],
): ReliefSupportLookupRow[] {
  return lines
    .filter((row) => {
      if (!range.allTime && !isDateInRange(row.ngay_phieu, range.start, range.end)) return false;
      if (dims.loai_phieu.length > 0 && !dims.loai_phieu.includes(row.loai_phieu)) return false;
      if (dims.kho_id.length > 0) {
        const khoIds = [row.kho_nhap_id, row.kho_xuat_id].filter(Boolean).map(String);
        if (!khoIds.some((id) => dims.kho_id.includes(id))) return false;
      }
      if (!matchesMulti(dims.don_vi_cuu_tro_id, row.don_vi_cuu_tro_id)) return false;
      if (!matchesMulti(dims.dot_cuu_tro_id, row.dot_cuu_tro_id)) return false;
      if (!matchesMulti(dims.hang_hoa_id, row.hang_hoa_id)) return false;
      if (dims.id_danh_muc.length > 0) {
        const cat = hangMap[row.hang_hoa_id]?.id_danh_muc;
        if (!cat || !dims.id_danh_muc.includes(cat)) return false;
      }
      return true;
    })
    .map((row) => enrichFlatRow(row, hangMap));
}

export type TrendBucket = 'day' | 'month';

export function pickTrendBucket(start: string, end: string): TrendBucket {
  const a = dayjs(start.slice(0, 10));
  const b = dayjs(end.slice(0, 10));
  const days = b.diff(a, 'day');
  return days > 62 ? 'month' : 'day';
}

export function resolveReliefTrendChartRange(
  range: ResolvedReliefDateRange,
  filtered: ReliefSupportLookupRow[],
): ResolvedReliefDateRange {
  if (!range.allTime) {
    return { start: range.start, end: range.end };
  }
  let min = '';
  let max = '';
  for (const item of filtered) {
    const d = item.ngay_phieu?.slice(0, 10);
    if (!d) continue;
    if (!min || d < min) min = d;
    if (!max || d > max) max = d;
  }
  const today = dayjs().format('YYYY-MM-DD');
  if (!min || !max) return { start: today, end: today };
  return { start: min, end: max };
}

export function buildReliefTrendSeries(
  filtered: ReliefSupportLookupRow[],
  range: ResolvedReliefDateRange,
  bucket: TrendBucket,
): ReliefSupportTrendPoint[] {
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

  const map = new Map<string, { nhap: number; xuat: number }>();
  for (const k of keys) map.set(k, { nhap: 0, xuat: 0 });

  for (const row of filtered) {
    const d = row.ngay_phieu?.slice(0, 10);
    if (!d) continue;
    const key = bucket === 'day' ? d : d.slice(0, 7);
    const cur = map.get(key);
    if (!cur) continue;
    const qty = row.so_luong || 0;
    if (row.loai_phieu === 'nhap_ngoai') cur.nhap += qty;
    else if (row.loai_phieu === 'xuat_ngoai') cur.xuat += qty;
  }

  return keys.map((key) => {
    const v = map.get(key) ?? { nhap: 0, xuat: 0 };
    const label =
      bucket === 'day' ? dayjs(key).format('DD/MM') : dayjs(`${key}-01`).format('MM/YYYY');
    return { key, label, nhap: v.nhap, xuat: v.xuat };
  });
}

function aggregateTopByKey(
  filtered: ReliefSupportLookupRow[],
  loai: NhapXuatKhoLoaiPhieu,
  pickKey: (row: ReliefSupportLookupRow) => string | null,
  pickLabel: (row: ReliefSupportLookupRow) => string,
  topN: number,
): ReliefSupportLabelValueRow[] {
  const tally = new Map<string, { label: string; value: number; soLuong: number }>();
  for (const row of filtered) {
    if (row.loai_phieu !== loai) continue;
    const id = pickKey(row);
    if (!id?.trim()) continue;
    const prev = tally.get(id);
    const tien = row.thanh_tien || 0;
    const sl = row.so_luong || 0;
    if (prev) {
      prev.value += tien;
      prev.soLuong += sl;
    } else {
      tally.set(id, { label: pickLabel(row), value: tien, soLuong: sl });
    }
  }
  return [...tally.entries()]
    .map(([id, v]) => ({ id, label: v.label, value: v.value, soLuong: v.soLuong }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

function aggregateByLoaiDonVi(
  filtered: ReliefSupportLookupRow[],
  master: ReliefSupportMasterMaps,
  topN: number,
): ReliefSupportLabelValueRow[] {
  const tally = new Map<string, { label: string; value: number; soLuong: number }>();
  for (const row of filtered) {
    if (row.loai_phieu !== 'nhap_ngoai') continue;
    const id = row.don_vi_cuu_tro_id?.trim();
    if (!id) continue;
    const dv = master.donViMap[id];
    const loaiKey = dv?.loai ?? 'don_vi';
    const label = dv?.loai_label ?? loaiKey;
    const prev = tally.get(loaiKey);
    const tien = row.thanh_tien || 0;
    const sl = row.so_luong || 0;
    if (prev) {
      prev.value += tien;
      prev.soLuong += sl;
    } else {
      tally.set(loaiKey, { label, value: tien, soLuong: sl });
    }
  }
  return [...tally.entries()]
    .map(([id, v]) => ({ id, label: v.label, value: v.value, soLuong: v.soLuong }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

export function computeReliefSupportKpis(
  filtered: ReliefSupportLookupRow[],
  tonMatrix: TonKhoRecord[],
): ReliefSupportKpis {
  const phieuSet = new Set<string>();
  const donViSet = new Set<string>();
  const dotSet = new Set<string>();
  let nhapSoLuong = 0;
  let nhapThanhTien = 0;
  let xuatSoLuong = 0;
  let xuatThanhTien = 0;
  let chuyenSoLuong = 0;

  for (const row of filtered) {
    phieuSet.add(row.phieu_id);
    const sl = row.so_luong || 0;
    const tien = row.thanh_tien || 0;
    if (row.loai_phieu === 'nhap_ngoai') {
      nhapSoLuong += sl;
      nhapThanhTien += tien;
      if (row.don_vi_cuu_tro_id?.trim()) donViSet.add(row.don_vi_cuu_tro_id);
    } else if (row.loai_phieu === 'xuat_ngoai') {
      xuatSoLuong += sl;
      xuatThanhTien += tien;
      if (row.dot_cuu_tro_id?.trim()) dotSet.add(row.dot_cuu_tro_id);
    } else if (row.loai_phieu === 'chuyen_kho') {
      chuyenSoLuong += sl;
    }
  }

  const khoCoHangSet = new Set<string>();
  let tonTongSoLuong = 0;
  for (const t of tonMatrix) {
    const qty = t.ton_kho || 0;
    if (qty > 0) {
      tonTongSoLuong += qty;
      khoCoHangSet.add(t.kho_id);
    }
  }

  return {
    phieuCount: phieuSet.size,
    lineCount: filtered.length,
    nhapSoLuong,
    nhapThanhTien,
    xuatSoLuong,
    xuatThanhTien,
    chuyenSoLuong,
    donViCoPhatSinh: donViSet.size,
    dotCoXuat: dotSet.size,
    tonTongSoLuong,
    khoCoHang: khoCoHangSet.size,
  };
}

export function computeReliefSupportStats(
  lines: NhapXuatKhoCtFlatRow[],
  master: ReliefSupportMasterMaps,
  tonMatrix: TonKhoRecord[],
  range: ResolvedReliefDateRange,
  dims: ReliefSupportDimensionFilters,
): ReliefSupportStatsResult {
  const filtered = filterReliefSupportRows(lines, range, dims, master.hangMap);
  const chartRange = resolveReliefTrendChartRange(range, filtered);
  const bucket = pickTrendBucket(chartRange.start, chartRange.end);
  const trendSeries = buildReliefTrendSeries(filtered, chartRange, bucket);
  const kpis = computeReliefSupportKpis(filtered, tonMatrix);

  return {
    filtered,
    kpis,
    trendSeries,
    topDonVi: aggregateTopByKey(
      filtered,
      'nhap_ngoai',
      (r) => r.don_vi_cuu_tro_id,
      (r) => r.ten_don_vi_cuu_tro ?? r.don_vi_cuu_tro_id ?? '—',
      10,
    ),
    topDot: aggregateTopByKey(
      filtered,
      'xuat_ngoai',
      (r) => r.dot_cuu_tro_id,
      (r) => r.ten_dot_cuu_tro ?? r.dot_cuu_tro_id ?? '—',
      10,
    ),
    byLoaiDonVi: aggregateByLoaiDonVi(filtered, master, 10),
    topHangNhap: aggregateTopByKey(
      filtered,
      'nhap_ngoai',
      (r) => r.hang_hoa_id,
      (r) => r.ten_hang_hoa ?? r.hang_hoa_id,
      10,
    ),
    topHangXuat: aggregateTopByKey(
      filtered,
      'xuat_ngoai',
      (r) => r.hang_hoa_id,
      (r) => r.ten_hang_hoa ?? r.hang_hoa_id,
      10,
    ),
  };
}

export function sortReliefLookupRows(
  rows: ReliefSupportLookupRow[],
  sortKey: ReliefSupportLookupSortKey,
  direction: 'asc' | 'desc',
  locale: string,
): ReliefSupportLookupRow[] {
  const dir = direction === 'asc' ? 1 : -1;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'ngay_phieu':
        cmp = (a.ngay_phieu ?? '').localeCompare(b.ngay_phieu ?? '');
        break;
      case 'so_phieu':
        cmp = (a.so_phieu ?? '').localeCompare(b.so_phieu ?? '', locale, { numeric: true });
        break;
      case 'loai_phieu':
        cmp = a.loai_phieu_label.localeCompare(b.loai_phieu_label, locale);
        break;
      case 'kho_label':
        cmp = a.kho_label.localeCompare(b.kho_label, locale);
        break;
      case 'nguon_dich_label':
        cmp = a.nguon_dich_label.localeCompare(b.nguon_dich_label, locale);
        break;
      case 'ten_hang_hoa':
        cmp = (a.ten_hang_hoa ?? '').localeCompare(b.ten_hang_hoa ?? '', locale);
        break;
      case 'so_luong':
        cmp = a.so_luong - b.so_luong;
        break;
      case 'thanh_tien':
        cmp = a.thanh_tien - b.thanh_tien;
        break;
      default:
        cmp = 0;
    }
    return cmp * dir;
  });
  return sorted;
}

export function buildReliefMasterMaps(
  donViList: { id: string; ten: string; loai: import('../../don-vi-cuu-tro/core/loai').KhoDonViCuuTroLoai; loai_label: string }[],
  dotList: { id: string; ten: string }[],
  hangList: { id: string; id_danh_muc: string; ten_danh_muc_nhom: string; ten_hang_hoa: string; don_vi_tinh: string }[],
  khoList: { id: string; ten_kho: string; ten_don_vi: string | null }[],
): ReliefSupportMasterMaps {
  const donViMap: ReliefSupportMasterMaps['donViMap'] = {};
  donViList.forEach((d) => {
    donViMap[String(d.id)] = { ten: d.ten, loai: d.loai, loai_label: d.loai_label };
  });
  const dotMap: ReliefSupportMasterMaps['dotMap'] = {};
  dotList.forEach((d) => {
    dotMap[String(d.id)] = { ten: d.ten };
  });
  const hangMap: ReliefSupportMasterMaps['hangMap'] = {};
  hangList.forEach((h) => {
    hangMap[String(h.id)] = {
      ten_hang_hoa: h.ten_hang_hoa,
      don_vi_tinh: h.don_vi_tinh,
      id_danh_muc: h.id_danh_muc,
      ten_danh_muc_nhom: h.ten_danh_muc_nhom,
    };
  });
  const khoMap: ReliefSupportMasterMaps['khoMap'] = {};
  khoList.forEach((k) => {
    khoMap[String(k.id)] = { ten_kho: k.ten_kho, ten_don_vi: k.ten_don_vi };
  });
  return { donViMap, dotMap, hangMap, khoMap };
}
