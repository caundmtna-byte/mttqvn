import { formatDateShort } from '@/lib/utils';
import type { ThucHienPhanBien } from '../core/types';
import { tinhTienDo } from '../core/display-tien-do';
import { formatTenDonViThucHien } from './display-don-vi-thuc-hien';

export function getThucHienColumnDisplayValue(
  item: ThucHienPhanBien,
  colId: string,
): string {
  switch (colId) {
    case 'don_vi_thuc_hien':
      return formatTenDonViThucHien(item);
    case 'tien_do':
      return tinhTienDo(item.ngay_ket_thuc) ?? item.mo_ta_thoi_gian ?? '';
    case 'ngay_bat_dau':
      return item.ngay_bat_dau ? formatDateShort(item.ngay_bat_dau) : '';
    case 'ngay_ket_thuc':
      return item.ngay_ket_thuc ? formatDateShort(item.ngay_ket_thuc) : '';
    case 'ho_va_ten_nguoi_tao':
      return item.ho_va_ten_nguoi_tao?.trim() || item.ten_tai_khoan_nguoi_tao?.trim() || '';
    default:
      return String((item as unknown as Record<string, unknown>)[colId] ?? '');
  }
}
