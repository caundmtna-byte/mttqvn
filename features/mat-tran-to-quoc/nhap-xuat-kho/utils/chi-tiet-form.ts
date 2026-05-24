import type { NhapXuatKhoCtLineFormValues, NhapXuatKhoFormValues } from '../core/schema';
import type { NhapXuatKhoCtRow, NhapXuatKhoDetail } from '../core/types';

export const NHAP_XUAT_KHO_CHI_TIET_TABLE_CLASS = 'min-w-[60rem]';
export const NHAP_XUAT_KHO_CHI_TIET_CELL_NOWRAP = 'whitespace-nowrap align-top';

export function nhapXuatKhoChiTietCellClass(extra: string): string {
  return `${NHAP_XUAT_KHO_CHI_TIET_CELL_NOWRAP} ${extra}`;
}

export function chiTietToLineForm(c: NhapXuatKhoCtRow): NhapXuatKhoCtLineFormValues {
  return {
    id: c.id,
    hang_hoa_id: c.hang_hoa_id,
    don_vi_tinh: c.don_vi_tinh,
    so_luong: String(c.so_luong),
    don_gia: String(c.don_gia),
    ghi_chu: c.ghi_chu ?? undefined,
  };
}

export function parentToFormValues(
  d: NhapXuatKhoDetail,
  chiLines: NhapXuatKhoCtLineFormValues[],
): NhapXuatKhoFormValues {
  return {
    loai_phieu: d.loai_phieu,
    ngay_phieu: d.ngay_phieu,
    kho_xuat_id: d.kho_xuat_id ?? undefined,
    kho_nhap_id: d.kho_nhap_id ?? undefined,
    don_vi_cuu_tro_id: d.don_vi_cuu_tro_id ?? undefined,
    dot_cuu_tro_id: d.dot_cuu_tro_id ?? undefined,
    ghi_chu: d.ghi_chu ?? undefined,
    chi_tiet: chiLines,
  };
}
