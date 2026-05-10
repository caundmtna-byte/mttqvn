import { normalizeCapQuanLyInput } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import { CHIP_FILTER_NULL } from '../core/constants';
import type { MttqCanBoRow } from '../core/types';

/** Giá trị chip lọc « Cấp quản lý » — `Tỉnh` | `Xã phường` | `__null__`. */
export function mttqCanBoCapQuanLyChipKeyFromRow(row: Pick<MttqCanBoRow, 'chuc_vu_cap_quan_ly'>): string {
  return normalizeCapQuanLyInput(row.chuc_vu_cap_quan_ly) ?? CHIP_FILTER_NULL;
}
