import { DON_VI_TINH_LABEL } from './constants';
import type { DipThamHoi } from './types';

export function formatDonViToChucDisplay(row: Pick<DipThamHoi, 'don_vi_to_chuc_id' | 'ten_don_vi_to_chuc'>): string {
  if (row.don_vi_to_chuc_id == null || row.don_vi_to_chuc_id === '') {
    return DON_VI_TINH_LABEL;
  }
  return row.ten_don_vi_to_chuc?.trim() || row.don_vi_to_chuc_id;
}
