import type { ViNguoiNgheo } from '../core/types';
import { VNN_TRANG_THAI_DA_NHAN } from '../core/constants';

export interface VnnThongKeDimensionFilters {
  nam: string[];
  linh_vuc: string[];
  nguon: string[];
  nguon_ho_tro: string[];
  doi_tuong: string[];
  hinh_thuc: string[];
  trang_thai: string[];
  xa_phuong: string[];
}

export const VNN_THONG_KE_INITIAL_DIMS: VnnThongKeDimensionFilters = {
  nam: [],
  linh_vuc: [],
  nguon: [],
  nguon_ho_tro: [],
  doi_tuong: [],
  hinh_thuc: [],
  trang_thai: [],
  xa_phuong: [],
};

/** `null` / rỗng khi lọc theo giá trị rời rạc — gom về một khoá riêng. */
export const VNN_KHONG_XAC_DINH = '__none__';

function matches(selected: readonly string[], value: string | null | undefined): boolean {
  if (selected.length === 0) return true;
  const v = value?.toString().trim();
  if (!v) return selected.includes(VNN_KHONG_XAC_DINH);
  return selected.includes(v);
}

export function filterRowsForVnnThongKe(
  rows: readonly ViNguoiNgheo[],
  dims: VnnThongKeDimensionFilters,
): ViNguoiNgheo[] {
  return rows.filter(
    (r) =>
      matches(dims.nam, String(r.nam ?? '')) &&
      matches(dims.linh_vuc, r.linh_vuc_ho_tro) &&
      matches(dims.nguon, r.nguon) &&
      matches(dims.nguon_ho_tro, r.nguon_ho_tro) &&
      matches(dims.doi_tuong, r.doi_tuong) &&
      matches(dims.hinh_thuc, r.hinh_thuc_ho_tro) &&
      matches(dims.trang_thai, r.trang_thai) &&
      matches(dims.xa_phuong, r.xa_phuong_id),
  );
}

function soTienHopLe(r: ViNguoiNgheo): number | null {
  if (r.so_tien == null) return null;
  const n = Number(r.so_tien);
  return Number.isFinite(n) ? n : null;
}

/**
 * Khoá "một người" để đếm số người được hỗ trợ: có hộ nghèo thì theo hộ; không
 * thì theo họ tên + xã (đã chuẩn hoá). Một người nhận nhiều khoản chỉ đếm một.
 */
export function vnnNguoiNhanKey(r: ViNguoiNgheo): string {
  const ho = r.ho_ngheo_id?.toString().trim();
  if (ho) return `ho:${ho}`;
  const ten = r.ho_ten_nguoi_nhan.trim().toLocaleLowerCase('vi').replace(/\s+/g, ' ');
  return `ten:${ten}|${r.xa_phuong_id ?? ''}`;
}

export interface VnnKpis {
  tongSoKhoan: number;
  /** Cộng các khoản ĐÃ có số tiền; khoản chỉ có quà (`so_tien = null`) không tính. */
  tongSoTien: number;
  daNhan: number;
  dangKhaoSat: number;
  /** 0–100, làm tròn. Không có khoản nào ⇒ 0. */
  tyLeDaNhan: number;
  soNguoiNhan: number;
}

export function computeVnnKpis(rows: readonly ViNguoiNgheo[]): VnnKpis {
  let tongSoTien = 0;
  let daNhan = 0;
  const nguoi = new Set<string>();

  for (const r of rows) {
    const tien = soTienHopLe(r);
    if (tien != null) tongSoTien += tien;
    if (r.trang_thai === VNN_TRANG_THAI_DA_NHAN) daNhan += 1;
    nguoi.add(vnnNguoiNhanKey(r));
  }

  const tongSoKhoan = rows.length;
  return {
    tongSoKhoan,
    tongSoTien,
    daNhan,
    dangKhaoSat: tongSoKhoan - daNhan,
    tyLeDaNhan: tongSoKhoan > 0 ? Math.round((daNhan / tongSoKhoan) * 100) : 0,
    soNguoiNhan: nguoi.size,
  };
}

export interface VnnNamPoint {
  nam: number;
  soKhoan: number;
  soTien: number;
}

/** Chuỗi xu hướng theo cột `nam` (số nguyên) — không đi qua dayjs. */
export function buildVnnNamSeries(rows: readonly ViNguoiNgheo[]): VnnNamPoint[] {
  const byNam = new Map<number, VnnNamPoint>();
  for (const r of rows) {
    const nam = Number(r.nam);
    if (!Number.isFinite(nam) || nam <= 0) continue;
    const cur = byNam.get(nam) ?? { nam, soKhoan: 0, soTien: 0 };
    cur.soKhoan += 1;
    cur.soTien += soTienHopLe(r) ?? 0;
    byNam.set(nam, cur);
  }
  return [...byNam.values()].sort((a, b) => a.nam - b.nam);
}

export interface VnnBarPoint {
  label: string;
  soKhoan: number;
  soTien: number;
}

type VnnCategoryKey =
  | 'linh_vuc_ho_tro'
  | 'nguon'
  | 'nguon_ho_tro'
  | 'doi_tuong'
  | 'hinh_thuc_ho_tro'
  | 'trang_thai';

/**
 * Gom theo một cột phân loại, giữ ĐÚNG thứ tự nghiệp vụ của `values` và luôn
 * trả đủ mọi giá trị — cột 0 vẫn hiện để người đọc thấy "nhóm này không có".
 */
export function buildVnnBarData(
  rows: readonly ViNguoiNgheo[],
  key: VnnCategoryKey,
  values: readonly string[],
): VnnBarPoint[] {
  const byLabel = new Map<string, VnnBarPoint>();
  for (const v of values) byLabel.set(v, { label: v, soKhoan: 0, soTien: 0 });

  for (const r of rows) {
    const label = r[key]?.toString().trim();
    if (!label) continue;
    const cur = byLabel.get(label) ?? { label, soKhoan: 0, soTien: 0 };
    cur.soKhoan += 1;
    cur.soTien += soTienHopLe(r) ?? 0;
    byLabel.set(label, cur);
  }
  return [...byLabel.values()];
}

export interface VnnGroupRow {
  id: string;
  label: string;
  soKhoan: number;
  soTien: number;
  daNhan: number;
}

/**
 * Gom theo một khoá (xã / đơn vị hỗ trợ). Dòng không có khoá gom vào MỘT dòng
 * riêng chứ không bị bỏ — bỏ đi thì tổng bảng lệch KPI mà không ai thấy.
 */
function aggregateBy(
  rows: readonly ViNguoiNgheo[],
  pick: (r: ViNguoiNgheo) => { id: string | null; label: string | null },
  labelKhongGan: string,
): VnnGroupRow[] {
  const byId = new Map<string, VnnGroupRow>();
  for (const r of rows) {
    const p = pick(r);
    const id = p.id?.toString().trim() || VNN_KHONG_XAC_DINH;
    const label = p.label?.toString().trim() || labelKhongGan;
    const cur = byId.get(id) ?? { id, label, soKhoan: 0, soTien: 0, daNhan: 0 };
    cur.soKhoan += 1;
    cur.soTien += soTienHopLe(r) ?? 0;
    if (r.trang_thai === VNN_TRANG_THAI_DA_NHAN) cur.daNhan += 1;
    byId.set(id, cur);
  }
  return [...byId.values()];
}

export function aggregateVnnByXaPhuong(
  rows: readonly ViNguoiNgheo[],
  labelKhongGan: string,
): VnnGroupRow[] {
  return aggregateBy(rows, (r) => ({ id: r.xa_phuong_id, label: r.ten_xa_phuong }), labelKhongGan).sort(
    (a, b) => b.soKhoan - a.soKhoan || a.label.localeCompare(b.label, 'vi'),
  );
}

/** Top đơn vị/cá nhân hỗ trợ theo tổng tiền, nhiều nhất trước. */
export function topVnnDonViByTien(
  rows: readonly ViNguoiNgheo[],
  labelKhongGan: string,
  limit = 10,
): VnnGroupRow[] {
  return aggregateBy(
    rows,
    (r) => ({ id: r.don_vi_ho_tro_id, label: r.ten_don_vi_ho_tro }),
    labelKhongGan,
  )
    .sort((a, b) => b.soTien - a.soTien || a.label.localeCompare(b.label, 'vi'))
    .slice(0, Math.max(1, limit));
}
