import type { LichSuNhapXuatRow, TonKhoHangNxHistoryRow } from '../core/types';

export function nxHistoryToLichSuRows(
  rows: TonKhoHangNxHistoryRow[],
  hangHoaId: string
): LichSuNhapXuatRow[] {
  return rows.map((r) => ({
    id_chi_tiet: r.chi_tiet_id,
    id_hang_hoa: hangHoaId,
    ngay: r.ngay_phieu,
    loai: r.loai_phieu,
    so_luong: r.so_luong,
    kho_xuat_id: r.kho_xuat_id,
    kho_nhap_id: r.kho_nhap_id,
  }));
}
