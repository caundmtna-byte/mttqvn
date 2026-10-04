import dayjs from 'dayjs';
import type { StandardResolvedDateRange } from '@/lib/date-range-presets';
import { resolveStatsTrendChartRange } from '@/components/shared/stats/resolve-trend-chart-range';
import type { TiepNhan } from '../core/types';

/** Mã giả cho dòng không có hình thức (khoản chỉ có hiện vật / giấy tờ / hàng qua kho). */
export const TN_KHONG_CO_TIEN = '__khong_co_tien__';

export interface TnThongKeDims {
  trang_thai: string[];
  /** Giá trị trong `TN_HINH_THUC_VALUES`, hoặc `TN_KHONG_CO_TIEN`. */
  hinh_thuc: string[];
  chuong_trinh: string[];
  nha_tai_tro: string[];
  /** `don_vi_chu_tri_loai:don_vi_chu_tri_id` — xem `tnDonViKey`. */
  don_vi_tiep_nhan: string[];
}

export const TN_THONG_KE_INITIAL_DIMS: TnThongKeDims = {
  trang_thai: [],
  hinh_thuc: [],
  chuong_trinh: [],
  nha_tai_tro: [],
  don_vi_tiep_nhan: [],
};

/** Khoá đơn vị tiếp nhận — tỉnh không có id nên ghép cả loại. */
export function tnDonViKey(r: Pick<TiepNhan, 'don_vi_chu_tri_loai' | 'don_vi_chu_tri_id'>): string {
  return `${r.don_vi_chu_tri_loai}:${r.don_vi_chu_tri_id ?? ''}`;
}

const hinhThucKey = (r: TiepNhan): string => r.hinh_thuc ?? TN_KHONG_CO_TIEN;
const inDims = (sel: readonly string[], v: string) => sel.length === 0 || sel.includes(v);

/** Lọc theo ngày tiếp nhận trong kỳ (bỏ qua khi «Tất cả») và các chiều. */
export function filterTnForThongKe(
  rows: readonly TiepNhan[],
  dims: TnThongKeDims,
  range: StandardResolvedDateRange,
): TiepNhan[] {
  const locNgay = !range.allTime && Boolean(range.start) && Boolean(range.end);
  return rows.filter((r) => {
    if (locNgay) {
      const d = r.ngay_tiep_nhan.slice(0, 10);
      if (!d || d < range.start.slice(0, 10) || d > range.end.slice(0, 10)) return false;
    }
    return (
      inDims(dims.trang_thai, r.trang_thai) &&
      inDims(dims.hinh_thuc, hinhThucKey(r)) &&
      inDims(dims.chuong_trinh, r.chuong_trinh_id) &&
      inDims(dims.nha_tai_tro, r.nha_tai_tro_id) &&
      inDims(dims.don_vi_tiep_nhan, tnDonViKey(r))
    );
  });
}

/** Hiện vật & giấy tờ = giấy tờ có giá + hiện vật khác + hàng qua kho. */
export function tnGiaTriHienVat(r: TiepNhan): number {
  return (r.giay_to_co_gia_gia_tri ?? 0) + (r.hien_vat_khac_gia_tri ?? 0) + (r.gia_tri_phieu_kho ?? 0);
}

export interface TnKpis {
  soKhoan: number;
  tongGiaTri: number;
  /** Σ `so_tien` — phần bằng tiền. */
  tongTien: number;
  chuyenKhoan: number;
  tienMat: number;
  hienVatGiayTo: number;
  /** Số nhà tài trợ khác nhau. */
  soNhaTaiTro: number;
  daBanGiao: number;
  /** 0–100, làm tròn; không có khoản nào ⇒ 0. */
  tyLeBanGiao: number;
}

export function computeTnKpis(rows: readonly TiepNhan[]): TnKpis {
  let tongGiaTri = 0;
  let tongTien = 0;
  let chuyenKhoan = 0;
  let tienMat = 0;
  let hienVatGiayTo = 0;
  let daBanGiao = 0;
  const ntt = new Set<string>();
  for (const r of rows) {
    tongGiaTri += r.tong_gia_tri || 0;
    const tien = r.so_tien || 0;
    tongTien += tien;
    if (r.hinh_thuc === 'Chuyển khoản') chuyenKhoan += tien;
    else if (r.hinh_thuc === 'Tiền mặt') tienMat += tien;
    hienVatGiayTo += tnGiaTriHienVat(r);
    if (r.trang_thai === 'Đã bàn giao') daBanGiao += 1;
    if (r.nha_tai_tro_id) ntt.add(r.nha_tai_tro_id);
  }
  const soKhoan = rows.length;
  return {
    soKhoan,
    tongGiaTri,
    tongTien,
    chuyenKhoan,
    tienMat,
    hienVatGiayTo,
    soNhaTaiTro: ntt.size,
    daBanGiao,
    tyLeBanGiao: soKhoan === 0 ? 0 : Math.round((daBanGiao / soKhoan) * 100),
  };
}

export type TnTrendBucket = 'day' | 'month';

export interface TnTrendPoint {
  key: string;
  label: string;
  soKhoan: number;
  tongGiaTri: number;
}

/**
 * Chuỗi xu hướng theo ngày (kỳ ≤ 62 ngày) hoặc theo tháng. Preset «Tất cả» quy về
 * min–max ngày thực tế (`resolveStatsTrendChartRange`) — không bao giờ lặp trên chuỗi rỗng.
 */
export function buildTnTrendSeries(rows: readonly TiepNhan[], range: StandardResolvedDateRange): TnTrendPoint[] {
  const r = resolveStatsTrendChartRange(range, rows, (x) => x.ngay_tiep_nhan);
  const start = dayjs(r.start.slice(0, 10));
  const end = dayjs(r.end.slice(0, 10));
  if (!start.isValid() || !end.isValid() || start.isAfter(end, 'day')) return [];
  const bucket: TnTrendBucket = end.diff(start, 'day') > 62 ? 'month' : 'day';

  const keys: string[] = [];
  if (bucket === 'day') {
    for (let cur = start; !cur.isAfter(end, 'day'); cur = cur.add(1, 'day')) keys.push(cur.format('YYYY-MM-DD'));
  } else {
    for (let cur = start.startOf('month'); !cur.isAfter(end, 'month'); cur = cur.add(1, 'month')) {
      keys.push(cur.format('YYYY-MM'));
    }
  }

  const map = new Map<string, { soKhoan: number; tongGiaTri: number }>();
  for (const k of keys) map.set(k, { soKhoan: 0, tongGiaTri: 0 });
  for (const row of rows) {
    const d = row.ngay_tiep_nhan.slice(0, 10);
    if (!d) continue;
    const cur = map.get(bucket === 'day' ? d : d.slice(0, 7));
    if (!cur) continue;
    cur.soKhoan += 1;
    cur.tongGiaTri += row.tong_gia_tri || 0;
  }

  return keys.map((key) => {
    const v = map.get(key) ?? { soKhoan: 0, tongGiaTri: 0 };
    const label = bucket === 'day' ? dayjs(key).format('DD/MM') : dayjs(`${key}-01`).format('MM/YYYY');
    return { key, label, ...v };
  });
}

export interface TnNhomRow {
  id: string;
  label: string;
  soKhoan: number;
  tongTien: number;
  tongGiaTri: number;
}

/** Gom theo một chiều, sắp giảm theo tổng giá trị (bằng nhau thì theo tên). */
export function aggregateTnBy(
  rows: readonly TiepNhan[],
  keyFn: (r: TiepNhan) => string,
  labelFn: (r: TiepNhan) => string,
): TnNhomRow[] {
  const map = new Map<string, TnNhomRow>();
  for (const r of rows) {
    const id = keyFn(r);
    let cur = map.get(id);
    if (!cur) {
      cur = { id, label: labelFn(r), soKhoan: 0, tongTien: 0, tongGiaTri: 0 };
      map.set(id, cur);
    }
    cur.soKhoan += 1;
    cur.tongTien += r.so_tien || 0;
    cur.tongGiaTri += r.tong_gia_tri || 0;
  }
  return [...map.values()].sort((a, b) => b.tongGiaTri - a.tongGiaTri || a.label.localeCompare(b.label, 'vi'));
}

export const aggregateTnByChuongTrinh = (rows: readonly TiepNhan[]) =>
  aggregateTnBy(rows, (r) => r.chuong_trinh_id, (r) => r.ten_chuong_trinh);
export const aggregateTnByNhaTaiTro = (rows: readonly TiepNhan[]) =>
  aggregateTnBy(rows, (r) => r.nha_tai_tro_id, (r) => r.ten_nha_tai_tro);
export const aggregateTnByDonVi = (rows: readonly TiepNhan[]) =>
  aggregateTnBy(rows, tnDonViKey, (r) => r.ten_don_vi_tiep_nhan);

export interface TnBarRow {
  key: string;
  label: string;
  soKhoan: number;
  tongGiaTri: number;
}

/**
 * Cột theo danh mục cố định (giữ đủ cột kể cả 0). Hình thức: dòng không có tiền
 * gộp vào cột `khongCoTienLabel`, chỉ hiện khi có dòng.
 */
export function buildTnBarData(
  rows: readonly TiepNhan[],
  field: 'trang_thai' | 'hinh_thuc',
  values: readonly string[],
  khongCoTienLabel = '',
): TnBarRow[] {
  const map = new Map<string, TnBarRow>(values.map((v) => [v, { key: v, label: v, soKhoan: 0, tongGiaTri: 0 }]));
  for (const r of rows) {
    const k = field === 'hinh_thuc' ? hinhThucKey(r) : r.trang_thai;
    let cur = map.get(k);
    if (!cur) {
      cur = { key: k, label: k === TN_KHONG_CO_TIEN ? khongCoTienLabel : k, soKhoan: 0, tongGiaTri: 0 };
      map.set(k, cur);
    }
    cur.soKhoan += 1;
    cur.tongGiaTri += r.tong_gia_tri || 0;
  }
  return [...map.values()];
}
