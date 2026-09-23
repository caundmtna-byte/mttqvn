import {
  formatDisplayDateShort,
  formatDisplayDateTimeShort,
  trimmedDisplay,
} from '@/lib/display-format';
import { formatCurrency } from '@/lib/utils';
import {
  khoDonViCuuTroLoaiLabel,
  parseKhoDonViCuuTroLoai,
} from '@/features/mat-tran-to-quoc/don-vi-cuu-tro/core/loai';
import type { KhenThuongNhaTaiTro } from '../core/types';

export const ktntText = (v: string | null | undefined) => trimmedDisplay(v);

/** `null` ⇒ rỗng chứ không phải "0 ₫" — chưa nhập khác hẳn bằng không. */
export function formatKtntTien(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '';
  return formatCurrency(Number(value));
}

export function formatKtntLoai(loai: string | null | undefined): string {
  return loai?.trim() ? khoDonViCuuTroLoaiLabel(parseKhoDonViCuuTroLoai(loai)) : '';
}

export function formatKtntKy(item: Pick<KhenThuongNhaTaiTro, 'nam_thanh_tich_tu' | 'nam_thanh_tich_den'>, tatCa: string): string {
  const { nam_thanh_tich_tu: tu, nam_thanh_tich_den: den } = item;
  if (tu == null && den == null) return tatCa;
  if (tu != null && den != null) return tu === den ? String(tu) : `${tu} – ${den}`;
  return tu != null ? `${tu} →` : `→ ${den}`;
}

export function formatKtntNguoiTao(item: KhenThuongNhaTaiTro): string {
  return item.ho_va_ten_nguoi_tao?.trim() || item.ten_tai_khoan_nguoi_tao?.trim() || '';
}

/** Chuỗi hiển thị của một cột — dùng chung cho bảng và file xuất. */
export function getKtntColumnDisplayValue(item: KhenThuongNhaTaiTro, colId: string): string {
  switch (colId) {
    case 'ngay_khen':
    case 'ngay_cap_nhat_trang_thai':
      return formatDisplayDateShort(item[colId]);
    case 'tg_cap_nhat':
    case 'tg_duyet':
      return formatDisplayDateTimeShort(item[colId]);
    case 'tong_gia_tri':
    case 'tong_tien_ho_tro':
    case 'gia_tri_dong_gop_khac':
      return formatKtntTien(item[colId]);
    case 'so_khoan_ho_tro':
    case 'so_nguoi_duoc_ho_tro':
      return String(item[colId] ?? 0);
    case 'loai_nha_tai_tro':
      return formatKtntLoai(item.loai_nha_tai_tro);
    case 'ho_va_ten_nguoi_tao':
      return formatKtntNguoiTao(item);
    default: {
      const v = (item as unknown as Record<string, unknown>)[colId];
      return v == null ? '' : String(v).trim();
    }
  }
}
