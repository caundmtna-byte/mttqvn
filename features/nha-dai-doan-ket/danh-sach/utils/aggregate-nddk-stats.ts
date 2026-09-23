import type { NhaDaiDoanKet } from '@/features/nha-dai-doan-ket/danh-sach/core/types';
import { NDDK_TRANG_THAI_HOAN_THANH } from '@/features/nha-dai-doan-ket/danh-sach/core/constants';

export interface NddkThongKeDimensionFilters {
  nam: string[];
  nguon: string[];
  nguon_ho_tro: string[];
  doi_tuong: string[];
  loai_hinh: string[];
  trang_thai: string[];
  xa_phuong: string[];
}

export const NDDK_THONG_KE_INITIAL_DIMS: NddkThongKeDimensionFilters = {
  nam: [],
  nguon: [],
  nguon_ho_tro: [],
  doi_tuong: [],
  loai_hinh: [],
  trang_thai: [],
  xa_phuong: [],
};

/** `null` / rỗng khi lọc theo giá trị rời rạc — gom về một khoá riêng. */
export const NDDK_KHONG_XAC_DINH = '__none__';

function matches(selected: readonly string[], value: string | null | undefined): boolean {
  if (selected.length === 0) return true;
  const v = value?.toString().trim();
  if (!v) return selected.includes(NDDK_KHONG_XAC_DINH);
  return selected.includes(v);
}

export function filterRowsForNddkThongKe(
  rows: readonly NhaDaiDoanKet[],
  dims: NddkThongKeDimensionFilters,
): NhaDaiDoanKet[] {
  return rows.filter(
    (r) =>
      matches(dims.nam, String(r.nam ?? '')) &&
      matches(dims.nguon, r.nguon) &&
      matches(dims.nguon_ho_tro, r.nguon_ho_tro) &&
      matches(dims.doi_tuong, r.doi_tuong) &&
      matches(dims.loai_hinh, r.loai_hinh_ho_tro) &&
      matches(dims.trang_thai, r.trang_thai) &&
      matches(dims.xa_phuong, r.xa_phuong_id),
  );
}

export interface NddkKpis {
  tongSoNha: number;
  /** Cộng các hồ sơ ĐÃ có mức hỗ trợ; hồ sơ `so_tien = null` không tính. */
  tongSoTien: number;
  /** Số hồ sơ có `so_tien` — mẫu số của bình quân. */
  soHoSoCoTien: number;
  daBanGiao: number;
  dangThucHien: number;
  /** 0–100, làm tròn. Không có hồ sơ nào ⇒ 0. */
  tyLeBanGiao: number;
  /** Bình quân trên các hồ sơ CÓ số tiền, không phải trên tổng số nhà. */
  binhQuanMoiNha: number;
}

export function computeNddkKpis(rows: readonly NhaDaiDoanKet[]): NddkKpis {
  let tongSoTien = 0;
  let soHoSoCoTien = 0;
  let daBanGiao = 0;
  let dangThucHien = 0;

  for (const r of rows) {
    const tien = Number(r.so_tien);
    if (r.so_tien != null && Number.isFinite(tien)) {
      tongSoTien += tien;
      soHoSoCoTien += 1;
    }
    if (r.trang_thai === NDDK_TRANG_THAI_HOAN_THANH) daBanGiao += 1;
    else if (r.trang_thai === 'Đang thực hiện') dangThucHien += 1;
  }

  const tongSoNha = rows.length;
  return {
    tongSoNha,
    tongSoTien,
    soHoSoCoTien,
    daBanGiao,
    dangThucHien,
    tyLeBanGiao: tongSoNha > 0 ? Math.round((daBanGiao / tongSoNha) * 100) : 0,
    binhQuanMoiNha: soHoSoCoTien > 0 ? Math.round(tongSoTien / soHoSoCoTien) : 0,
  };
}

export interface NddkNamPoint {
  nam: number;
  soNha: number;
  soTien: number;
}

/**
 * Chuỗi xu hướng theo NĂM.
 *
 * Trục thời gian của nghiệp vụ này là cột `nam` (số nguyên), không phải một cột
 * ngày — nên không đi qua `dayjs` và không dính bẫy "preset Tất cả trả chuỗi
 * rỗng ⇒ vòng lặp vô tận" của các trang thống kê khác.
 */
export function buildNddkNamSeries(rows: readonly NhaDaiDoanKet[]): NddkNamPoint[] {
  const byNam = new Map<number, NddkNamPoint>();
  for (const r of rows) {
    const nam = Number(r.nam);
    if (!Number.isFinite(nam) || nam <= 0) continue;
    const cur = byNam.get(nam) ?? { nam, soNha: 0, soTien: 0 };
    cur.soNha += 1;
    const tien = Number(r.so_tien);
    if (r.so_tien != null && Number.isFinite(tien)) cur.soTien += tien;
    byNam.set(nam, cur);
  }
  return [...byNam.values()].sort((a, b) => a.nam - b.nam);
}

export interface NddkBarPoint {
  label: string;
  soNha: number;
  soTien: number;
}

type NddkCategoryKey = 'nguon' | 'nguon_ho_tro' | 'doi_tuong' | 'loai_hinh_ho_tro' | 'trang_thai';

/**
 * Gom theo một cột phân loại, giữ ĐÚNG thứ tự của `values` (thứ tự nghiệp vụ,
 * không phải bảng chữ cái) và luôn trả đủ mọi giá trị — cột 0 vẫn xuất hiện để
 * người đọc thấy "nhóm này không có hồ sơ nào" thay vì tưởng bị lọc mất.
 */
export function buildNddkBarData(
  rows: readonly NhaDaiDoanKet[],
  key: NddkCategoryKey,
  values: readonly string[],
): NddkBarPoint[] {
  const byLabel = new Map<string, NddkBarPoint>();
  for (const v of values) byLabel.set(v, { label: v, soNha: 0, soTien: 0 });

  for (const r of rows) {
    const raw = r[key];
    const label = raw?.toString().trim();
    if (!label) continue;
    const cur = byLabel.get(label) ?? { label, soNha: 0, soTien: 0 };
    cur.soNha += 1;
    const tien = Number(r.so_tien);
    if (r.so_tien != null && Number.isFinite(tien)) cur.soTien += tien;
    byLabel.set(label, cur);
  }
  return [...byLabel.values()];
}

export interface NddkXaPhuongRow {
  id: string;
  label: string;
  soNha: number;
  soTien: number;
  daBanGiao: number;
}

/**
 * Gom theo xã/phường. Hồ sơ chưa gán xã gom vào một dòng riêng (`labelKhongGan`)
 * chứ không bị bỏ đi — bỏ đi thì tổng của bảng lệch với KPI mà không ai thấy.
 */
export function aggregateNddkByXaPhuong(
  rows: readonly NhaDaiDoanKet[],
  labelKhongGan: string,
): NddkXaPhuongRow[] {
  const byXa = new Map<string, NddkXaPhuongRow>();
  for (const r of rows) {
    const id = r.xa_phuong_id?.toString().trim() || NDDK_KHONG_XAC_DINH;
    const label = r.ten_xa_phuong?.toString().trim() || labelKhongGan;
    const cur = byXa.get(id) ?? { id, label, soNha: 0, soTien: 0, daBanGiao: 0 };
    cur.soNha += 1;
    const tien = Number(r.so_tien);
    if (r.so_tien != null && Number.isFinite(tien)) cur.soTien += tien;
    if (r.trang_thai === NDDK_TRANG_THAI_HOAN_THANH) cur.daBanGiao += 1;
    byXa.set(id, cur);
  }
  return [...byXa.values()].sort((a, b) => {
    if (b.soNha !== a.soNha) return b.soNha - a.soNha;
    return a.label.localeCompare(b.label, 'vi');
  });
}

/** Top xã/phường theo tổng số tiền, nhiều nhất trước. */
export function topNddkXaPhuongByTien(
  rows: readonly NddkXaPhuongRow[],
  limit = 10,
): NddkXaPhuongRow[] {
  return [...rows]
    .sort((a, b) => {
      if (b.soTien !== a.soTien) return b.soTien - a.soTien;
      return a.label.localeCompare(b.label, 'vi');
    })
    .slice(0, Math.max(1, limit));
}
