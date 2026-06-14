import { formatDisplayDateShort, formatDisplayDateTimeShort, formatDisplayInteger, trimmedDisplay } from '@/lib/display-format';
import type { ThucHienPhanBien } from '../core/types';
import { tinhTienDo } from '../core/display-tien-do';
import { formatTenDonViThucHien } from './display-don-vi-thuc-hien';

/** @deprecated Dùng `trimmedDisplay` từ `@/lib/display-format`. */
export const trimmedPbxhDisplay = trimmedDisplay;

export function formatPbxhNgayDisplay(value: string | null | undefined): string {
  return formatDisplayDateShort(value);
}

export function formatPbxhDateTimeDisplay(value: string | null | undefined): string {
  return formatDisplayDateTimeShort(value);
}

export function formatPbxhPhanTramDisplay(value: number | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `${n}%`;
}

export function formatPbxhSoNguyenDisplay(value: number | null | undefined): string {
  return formatDisplayInteger(value);
}

export function formatPbxhNguoiTaoDisplay(item: ThucHienPhanBien): string {
  return item.ho_va_ten_nguoi_tao?.trim() || item.ten_tai_khoan_nguoi_tao?.trim() || '';
}

export function formatPbxhTienDoDisplay(item: ThucHienPhanBien): string {
  return tinhTienDo(item.ngay_ket_thuc) ?? trimmedDisplay(item.mo_ta_thoi_gian) ?? '';
}

export function formatPbxhDonViThucHienDisplay(item: ThucHienPhanBien): string {
  return formatTenDonViThucHien(item);
}
