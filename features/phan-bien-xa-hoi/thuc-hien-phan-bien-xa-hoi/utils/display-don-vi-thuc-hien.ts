import { txt } from '@/lib/text';
import type { ThucHienPhanBien } from '../core/types';

export function formatTenDonViThucHien(
  row: Pick<ThucHienPhanBien, 'don_vi_thuc_hien_id' | 'ten_don_vi_thuc_hien'>,
): string {
  if (row.don_vi_thuc_hien_id == null || row.don_vi_thuc_hien_id === '') {
    return txt('pbxhThucHien.store.donViThucHienTinhCap');
  }
  return row.ten_don_vi_thuc_hien?.trim() || txt('common.emptyCell');
}
