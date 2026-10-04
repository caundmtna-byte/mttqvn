import { formatDisplayDateShort, formatDisplayDateTimeShort } from '@/lib/display-format';
import { tenNguoiThaoTac } from '@/lib/nguoi-thao-tac';
import type { TiepNhan } from '../core/types';

/** "1.250.000 đ"; 0 / trống ⇒ ''. */
export function formatTnTien(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n === 0) return '';
  return `${Math.round(n).toLocaleString('vi-VN')} đ`;
}

/** Chuỗi hiển thị của một cột — bảng và file xuất dùng chung. */
export function getTnColumnDisplayValue(row: TiepNhan, colId: string): string {
  switch (colId) {
    case 'ngay_tiep_nhan':
      return formatDisplayDateShort(row.ngay_tiep_nhan);
    case 'so_tien':
    case 'giay_to_co_gia_gia_tri':
    case 'hien_vat_khac_gia_tri':
    case 'gia_tri_phieu_kho':
    case 'tong_gia_tri':
      return formatTnTien(row[colId]);
    case 'ho_va_ten_nguoi_tao':
      return tenNguoiThaoTac({ ho_va_ten: row.ho_va_ten_nguoi_tao, ten_tai_khoan: row.ten_tai_khoan_nguoi_tao }) ?? '';
    case 'tg_cap_nhat':
      return formatDisplayDateTimeShort(row.tg_cap_nhat);
    default: {
      const v = (row as unknown as Record<string, unknown>)[colId];
      return v == null ? '' : String(v);
    }
  }
}
