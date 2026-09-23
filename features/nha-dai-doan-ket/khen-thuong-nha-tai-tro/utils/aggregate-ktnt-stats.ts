import type { KhenThuongNhaTaiTro } from '../core/types';

export interface KtntThongKeDims {
  nam: string[];
  cap_khen: string[];
  trang_thai: string[];
  loai_nha_tai_tro: string[];
}

export const KTNT_THONG_KE_INITIAL_DIMS: KtntThongKeDims = {
  nam: [],
  cap_khen: [],
  trang_thai: [],
  loai_nha_tai_tro: [],
};

export const KTNT_KHONG_XAC_DINH = '__none__';

/** Năm của quyết định = năm của `ngay_khen` (`YYYY-MM-DD`). */
export function ktntNamKhen(r: Pick<KhenThuongNhaTaiTro, 'ngay_khen'>): number | null {
  const n = Number.parseInt(String(r.ngay_khen ?? '').slice(0, 4), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function matches(selected: readonly string[], value: string | null | undefined): boolean {
  if (selected.length === 0) return true;
  const v = value?.toString().trim();
  if (!v) return selected.includes(KTNT_KHONG_XAC_DINH);
  return selected.includes(v);
}

export function filterRowsForKtntThongKe(
  rows: readonly KhenThuongNhaTaiTro[],
  dims: KtntThongKeDims,
): KhenThuongNhaTaiTro[] {
  return rows.filter(
    (r) =>
      matches(dims.nam, String(ktntNamKhen(r) ?? '')) &&
      matches(dims.cap_khen, r.cap_khen) &&
      matches(dims.trang_thai, r.trang_thai) &&
      matches(dims.loai_nha_tai_tro, r.loai_nha_tai_tro),
  );
}

const daDuyet = (r: KhenThuongNhaTaiTro) => r.trang_thai === 'Đã duyệt';

export interface KtntKpis {
  tongQuyetDinh: number;
  /** Số nhà tài trợ KHÁC NHAU có ít nhất một quyết định đã duyệt. */
  soNhaTaiTro: number;
  daDuyet: number;
  choDuyet: number;
  /** 0–100 trên các quyết định đã ra kết luận (không tính chờ duyệt / huỷ). */
  tyLeDuyet: number;
  /**
   * Chỉ cộng quyết định ĐÃ DUYỆT. Hai quyết định của cùng một nhà tài trợ có
   * kỳ thành tích chồng nhau sẽ cộng trùng — con số này là "giá trị được ghi
   * nhận trong các quyết định", không phải tổng tiền thực nhận.
   */
  tongGiaTri: number;
}

export function computeKtntKpis(rows: readonly KhenThuongNhaTaiTro[]): KtntKpis {
  let duyet = 0;
  let cho = 0;
  let khong = 0;
  let tongGiaTri = 0;
  const nhaTaiTro = new Set<string>();
  for (const r of rows) {
    if (daDuyet(r)) {
      duyet += 1;
      tongGiaTri += Number(r.tong_gia_tri) || 0;
      nhaTaiTro.add(r.nha_tai_tro_id);
    } else if (r.trang_thai === 'Chờ duyệt') cho += 1;
    else if (r.trang_thai === 'Không duyệt') khong += 1;
  }
  const ketLuan = duyet + khong;
  return {
    tongQuyetDinh: rows.length,
    soNhaTaiTro: nhaTaiTro.size,
    daDuyet: duyet,
    choDuyet: cho,
    tyLeDuyet: ketLuan > 0 ? Math.round((duyet / ketLuan) * 100) : 0,
    tongGiaTri,
  };
}

export interface KtntNamPoint {
  nam: number;
  soQuyetDinh: number;
  daDuyet: number;
}

export function buildKtntNamSeries(rows: readonly KhenThuongNhaTaiTro[]): KtntNamPoint[] {
  const by = new Map<number, KtntNamPoint>();
  for (const r of rows) {
    const nam = ktntNamKhen(r);
    if (nam == null) continue;
    const cur = by.get(nam) ?? { nam, soQuyetDinh: 0, daDuyet: 0 };
    cur.soQuyetDinh += 1;
    if (daDuyet(r)) cur.daDuyet += 1;
    by.set(nam, cur);
  }
  return [...by.values()].sort((a, b) => a.nam - b.nam);
}

export interface KtntBarPoint {
  label: string;
  soQuyetDinh: number;
}

/** Đủ mọi giá trị theo thứ tự nghiệp vụ, nhóm rỗng = 0. `labelOf` đổi khoá ra nhãn. */
export function buildKtntBarData(
  rows: readonly KhenThuongNhaTaiTro[],
  key: 'cap_khen' | 'trang_thai' | 'loai_nha_tai_tro',
  values: readonly string[],
  labelOf: (v: string) => string = (v) => v,
): KtntBarPoint[] {
  const by = new Map<string, number>(values.map((v) => [v, 0]));
  for (const r of rows) {
    const v = r[key]?.toString().trim();
    if (!v) continue;
    by.set(v, (by.get(v) ?? 0) + 1);
  }
  return [...by.entries()].map(([v, n]) => ({ label: labelOf(v), soQuyetDinh: n }));
}

export interface KtntGroupRow {
  id: string;
  label: string;
  soQuyetDinh: number;
  giaTri: number;
}

/** Top nhà tài trợ theo tổng giá trị của các quyết định ĐÃ DUYỆT. */
export function topKtntNhaTaiTro(rows: readonly KhenThuongNhaTaiTro[], limit = 10): KtntGroupRow[] {
  const by = new Map<string, KtntGroupRow>();
  for (const r of rows) {
    if (!daDuyet(r)) continue;
    const cur = by.get(r.nha_tai_tro_id) ?? {
      id: r.nha_tai_tro_id,
      label: r.ten_nha_tai_tro?.trim() || `#${r.nha_tai_tro_id}`,
      soQuyetDinh: 0,
      giaTri: 0,
    };
    cur.soQuyetDinh += 1;
    cur.giaTri += Number(r.tong_gia_tri) || 0;
    by.set(r.nha_tai_tro_id, cur);
  }
  return [...by.values()]
    .sort((a, b) => b.giaTri - a.giaTri || b.soQuyetDinh - a.soQuyetDinh || a.label.localeCompare(b.label, 'vi'))
    .slice(0, Math.max(1, limit));
}

/** Quyết định cấp xã theo xã (cấp khác không có xã nên không vào bảng này). */
export function aggregateKtntByXaPhuong(rows: readonly KhenThuongNhaTaiTro[]): KtntGroupRow[] {
  const by = new Map<string, KtntGroupRow>();
  for (const r of rows) {
    const id = r.xa_phuong_id?.trim();
    if (!id) continue;
    const cur = by.get(id) ?? { id, label: r.ten_xa_phuong?.trim() || `#${id}`, soQuyetDinh: 0, giaTri: 0 };
    cur.soQuyetDinh += 1;
    if (daDuyet(r)) cur.giaTri += Number(r.tong_gia_tri) || 0;
    by.set(id, cur);
  }
  return [...by.values()].sort((a, b) => b.soQuyetDinh - a.soQuyetDinh || a.label.localeCompare(b.label, 'vi'));
}
