import { DON_VI_THAM_HOI_TINH_LABEL } from './constants';
import type { ThamHoiToChuc } from './types';

export function formatDonViThamHoiDisplay(
  row: Pick<ThamHoiToChuc, 'don_vi_tham_hoi_id' | 'ten_don_vi_tham_hoi'>,
): string {
  if (row.don_vi_tham_hoi_id == null || row.don_vi_tham_hoi_id === '') {
    return DON_VI_THAM_HOI_TINH_LABEL;
  }
  return row.ten_don_vi_tham_hoi?.trim() || row.don_vi_tham_hoi_id;
}
