import type { KhoDonViCuuTroListRow, KhoDonViCuuTroLoai } from '../core/types';
import { KHO_DON_VI_CUU_TRO_LOAI } from '../core/loai';
import type { DonViCuuTroUngHoTong } from './ung-ho-nhom';

export interface DonViCuuTroThongKeDims {
  loai: string[];
  /** So theo `don_vi_gioi_thieu_label` — cùng cách bộ lọc của tab Danh sách. */
  don_vi_gioi_thieu: string[];
  /** Nhóm ủng hộ (đợt / nội dung) — KHÔNG lọc đơn vị, chỉ giới hạn số cộng (`tongHopUngHoTheoDonVi`). */
  nhom: string[];
}

export const DON_VI_CUU_TRO_THONG_KE_INITIAL_DIMS: DonViCuuTroThongKeDims = {
  loai: [],
  don_vi_gioi_thieu: [],
  nhom: [],
};

/** Một đơn vị kèm số ủng hộ TRONG KỲ (không phải luỹ kế `ket_qua_ung_ho`). */
export interface DonViCuuTroThongKeRow {
  row: KhoDonViCuuTroListRow;
  tienMat: number;
  hienVat: number;
  tong: number;
  soLuot: number;
}

export function filterDonViCuuTroForThongKe(
  rows: readonly KhoDonViCuuTroListRow[],
  dims: DonViCuuTroThongKeDims,
): KhoDonViCuuTroListRow[] {
  return rows.filter(
    (r) =>
      (dims.loai.length === 0 || dims.loai.includes(r.loai)) &&
      (dims.don_vi_gioi_thieu.length === 0 ||
        dims.don_vi_gioi_thieu.includes(r.don_vi_gioi_thieu_label)),
  );
}

/** Ghép số ủng hộ theo kỳ vào danh sách; đơn vị không phát sinh trong kỳ = 0. */
export function mergeDonViCuuTroUngHo(
  rows: readonly KhoDonViCuuTroListRow[],
  ungHo: ReadonlyMap<string, DonViCuuTroUngHoTong>,
): DonViCuuTroThongKeRow[] {
  return rows.map((row) => {
    const u = ungHo.get(row.id);
    const tienMat = u?.tienMat ?? 0;
    const hienVat = u?.hienVat ?? 0;
    return { row, tienMat, hienVat, tong: tienMat + hienVat, soLuot: u?.soLuot ?? 0 };
  });
}

export interface DonViCuuTroKpis {
  tongDonVi: number;
  /** Đơn vị có ít nhất một lượt ủng hộ trong kỳ. */
  donViCoUngHo: number;
  /** 0–100, làm tròn. Không có đơn vị nào ⇒ 0. */
  tyLeCoUngHo: number;
  tongUngHo: number;
  tongTienMat: number;
  tongHienVat: number;
  soLuot: number;
  /** Bình quân trên các đơn vị CÓ ủng hộ, không phải trên tổng số đơn vị. */
  binhQuan: number;
}

export function computeDonViCuuTroKpis(rows: readonly DonViCuuTroThongKeRow[]): DonViCuuTroKpis {
  let donViCoUngHo = 0;
  let tongTienMat = 0;
  let tongHienVat = 0;
  let soLuot = 0;
  for (const r of rows) {
    if (r.soLuot > 0) donViCoUngHo += 1;
    tongTienMat += r.tienMat;
    tongHienVat += r.hienVat;
    soLuot += r.soLuot;
  }
  const tongUngHo = tongTienMat + tongHienVat;
  const tongDonVi = rows.length;
  return {
    tongDonVi,
    donViCoUngHo,
    tyLeCoUngHo: tongDonVi > 0 ? Math.round((donViCoUngHo / tongDonVi) * 100) : 0,
    tongUngHo,
    tongTienMat,
    tongHienVat,
    soLuot,
    binhQuan: donViCoUngHo > 0 ? Math.round(tongUngHo / donViCoUngHo) : 0,
  };
}

export interface DonViCuuTroNhomRow {
  key: string;
  soDonVi: number;
  donViCoUngHo: number;
  tienMat: number;
  hienVat: number;
  tong: number;
}

/** Đủ mọi loại theo thứ tự nghiệp vụ, loại không có đơn vị nào = 0. */
export function aggregateDonViCuuTroByLoai(
  rows: readonly DonViCuuTroThongKeRow[],
): (DonViCuuTroNhomRow & { key: KhoDonViCuuTroLoai })[] {
  const map = new Map<KhoDonViCuuTroLoai, DonViCuuTroNhomRow & { key: KhoDonViCuuTroLoai }>(
    KHO_DON_VI_CUU_TRO_LOAI.map((key) => [key, { key, soDonVi: 0, donViCoUngHo: 0, tienMat: 0, hienVat: 0, tong: 0 }]),
  );
  for (const r of rows) {
    const g = map.get(r.row.loai);
    if (!g) continue;
    g.soDonVi += 1;
    if (r.soLuot > 0) g.donViCoUngHo += 1;
    g.tienMat += r.tienMat;
    g.hienVat += r.hienVat;
    g.tong += r.tong;
  }
  return [...map.values()];
}

/** Theo đơn vị giới thiệu — chỉ nhóm có đơn vị, sắp theo số tiền giảm dần rồi theo tên. */
export function aggregateDonViCuuTroByGioiThieu(
  rows: readonly DonViCuuTroThongKeRow[],
): DonViCuuTroNhomRow[] {
  const map = new Map<string, DonViCuuTroNhomRow>();
  for (const r of rows) {
    const key = r.row.don_vi_gioi_thieu_label;
    const g = map.get(key) ?? { key, soDonVi: 0, donViCoUngHo: 0, tienMat: 0, hienVat: 0, tong: 0 };
    g.soDonVi += 1;
    if (r.soLuot > 0) g.donViCoUngHo += 1;
    g.tienMat += r.tienMat;
    g.hienVat += r.hienVat;
    g.tong += r.tong;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => b.tong - a.tong || a.key.localeCompare(b.key, 'vi'));
}

/** Top `n` đơn vị có ủng hộ trong kỳ, số tiền giảm dần; bằng tiền thì theo tên. */
export function topDonViCuuTroByTien(
  rows: readonly DonViCuuTroThongKeRow[],
  n: number,
): DonViCuuTroThongKeRow[] {
  return rows
    .filter((r) => r.soLuot > 0)
    .sort((a, b) => b.tong - a.tong || a.row.ten.localeCompare(b.row.ten, 'vi'))
    .slice(0, n);
}
