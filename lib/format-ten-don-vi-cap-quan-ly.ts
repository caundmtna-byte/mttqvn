import { txt } from '@/lib/text';

/**
 * Đồng bộ bảng Nhân viên (`nhan-vien-table.tsx`):
 * `var_chuc_vu.cap_quan_ly === 'Tỉnh'` → không có đơn vị xã cấp — hiển thị gạch `-`, không dùng « Chưa có ».
 */
export function formatTenDonViCongTacDisplay(
  chucVuCapQuanLy: string | null | undefined,
  tenDonVi: string | null | undefined,
): string {
  if (chucVuCapQuanLy === 'Tỉnh') return '-';
  const t = tenDonVi?.trim();
  return t ? t : txt('common.emptyCell');
}
