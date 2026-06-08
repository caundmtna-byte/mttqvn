import { DON_VI_THAM_HOI_CQMTTQ_LABEL } from './constants';
import type { ThamHoiCaNhan } from './types';

export function formatDonViThamHoiDisplay(row: Pick<ThamHoiCaNhan, 'don_vi_tham_hoi_id' | 'ten_don_vi_tham_hoi'>): string {
  if (row.don_vi_tham_hoi_id == null || row.don_vi_tham_hoi_id === '') {
    return DON_VI_THAM_HOI_CQMTTQ_LABEL;
  }
  return row.ten_don_vi_tham_hoi?.trim() || row.don_vi_tham_hoi_id;
}

export function formatXaPhuongDisplay(row: Pick<ThamHoiCaNhan, 'ten_xa_phuong'>): string | null {
  const t = row.ten_xa_phuong?.trim();
  return t ? t : null;
}
