import type { BaiVietDanhSachFilters } from '../core/types';

export function countBaiVietColumnSearchActive(
  columnSearch: Record<string, string>,
  chips?: Pick<BaiVietDanhSachFilters, 'id_the_loai' | 'id_nguon_dang' | 'id_trang_dang' | 'id_nguoi_tao'>,
): number {
  let n = 0;
  const skipTheLoaiCol = (chips?.id_the_loai?.length ?? 0) > 0;
  const skipNguonCol = (chips?.id_nguon_dang?.length ?? 0) > 0;
  const skipTrangCol = (chips?.id_trang_dang?.length ?? 0) > 0;
  const skipNguoiTaoCol = (chips?.id_nguoi_tao?.length ?? 0) > 0;
  for (const [colId, v] of Object.entries(columnSearch)) {
    if (!(v ?? '').trim()) continue;
    if (skipTheLoaiCol && colId === 'ten_the_loai') continue;
    if (skipNguonCol && colId === 'ten_nguon_dang') continue;
    if (skipTrangCol && colId === 'ten_trang_dang') continue;
    if (skipNguoiTaoCol && colId === 'ho_va_ten_nguoi_tao') continue;
    n += 1;
  }
  return n;
}
