import type { LichSuNhapXuatRow } from '../core/types';
import type { NhapXuatKhoLoaiPhieu } from '../../nhap-xuat-kho/core/constants';

function globalDelta(row: LichSuNhapXuatRow): number {
  const q = row.so_luong;
  if (q <= 0) return 0;
  switch (row.loai) {
    case 'nhap_ngoai':
      return q;
    case 'xuat_ngoai':
      return -q;
    case 'chuyen_kho':
      return 0;
    default:
      return 0;
  }
}

function sortChronological(a: LichSuNhapXuatRow, b: LichSuNhapXuatRow): number {
  const da = (a.ngay ?? '').slice(0, 10);
  const db = (b.ngay ?? '').slice(0, 10);
  if (da !== db) return da.localeCompare(db);
  return a.id_chi_tiet.localeCompare(b.id_chi_tiet, undefined, { numeric: true });
}

/** Luỹ kế tồn sau mỗi dòng chi tiết (tổng toàn hệ thống theo hàng). */
export function computeTonSauByChiTiet(
  rows: LichSuNhapXuatRow[],
  mode: 'byProductGlobal'
): Map<string, number> {
  if (mode !== 'byProductGlobal') return new Map();
  const sorted = [...rows].sort(sortChronological);
  let running = 0;
  const out = new Map<string, number>();
  for (const row of sorted) {
    running += globalDelta(row);
    out.set(row.id_chi_tiet, running);
  }
  return out;
}

export function loaiPhieuShortLabel(loai: NhapXuatKhoLoaiPhieu): string {
  switch (loai) {
    case 'nhap_ngoai':
      return 'nhap';
    case 'xuat_ngoai':
      return 'xuat';
    case 'chuyen_kho':
      return 'chuyen';
    default:
      return loai;
  }
}
