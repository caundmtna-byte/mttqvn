import type { LoaiPhieuKho } from '../../../kho-van/phieu-kho/core/types';
import type { LichSuNhapXuatRow } from '../../../kho-van/phieu-kho/services/phieu-kho-service';
import type { TonKhoPTHangNxHistoryRow } from '../core/types';

/** Phiếu Không duyệt không làm thay đổi luỹ kế (khớp tính tồn / NXT). */
function tinhVaoTon(trangThai: string): boolean {
  return (trangThai ?? '').trim() !== 'Không duyệt';
}

/** Map lịch sử NX Farm → dòng dùng chung `computeTonSauByChiTiet` (byProductGlobal). */
export function farmNxHistoryToLichSuRows(
  rows: TonKhoPTHangNxHistoryRow[],
  idHangHoa: string
): LichSuNhapXuatRow[] {
  return rows.map((r) => {
    const q = tinhVaoTon(r.trang_thai) ? r.so_luong : 0;
    return {
      id_phieu_kho: String(r.id_phieu_kho),
      id_chi_tiet: String(r.chi_tiet_id),
      id_hang_hoa: idHangHoa,
      so_phieu: r.so_phieu,
      ngay: r.ngay,
      loai: r.loai as LoaiPhieuKho,
      so_luong: q,
      don_vi_tinh: r.don_vi_tinh ?? undefined,
      ten_kho: r.ten_kho ?? undefined,
      ten_kho_den: r.ten_kho_den ?? undefined,
      kho_id: r.kho_id,
      kho_den_id: r.kho_den_id,
      tg_tao: r.phieu_tg_tao ?? null,
    };
  });
}
