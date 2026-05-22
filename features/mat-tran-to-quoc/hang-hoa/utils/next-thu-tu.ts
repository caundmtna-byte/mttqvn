import type { KhoDanhMucHangHoaListRow, KhoDanhSachHangHoaListRow } from '../core/types';

/** Thứ tự tiếp theo trong danh sách danh mục (cùng cấp). */
export function nextThuTuDanhMuc(rows: readonly Pick<KhoDanhMucHangHoaListRow, 'thu_tu'>[] | null | undefined): number {
  const max = (rows ?? []).reduce((m, r) => Math.max(m, Number(r.thu_tu) || 0), -1);
  return max + 1;
}

/** Thứ tự tiếp theo trong một danh mục (hàng cùng `id_danh_muc`). */
export function nextThuTuHangHoaTrongDanhMuc(
  rows: readonly Pick<KhoDanhSachHangHoaListRow, 'id_danh_muc' | 'thu_tu'>[] | null | undefined,
  idDanhMuc: string,
): number {
  const id = idDanhMuc.trim();
  if (!id) return 0;
  const max = (rows ?? [])
    .filter((r) => String(r.id_danh_muc ?? '').trim() === id)
    .reduce((m, r) => Math.max(m, Number(r.thu_tu) || 0), -1);
  return max + 1;
}
