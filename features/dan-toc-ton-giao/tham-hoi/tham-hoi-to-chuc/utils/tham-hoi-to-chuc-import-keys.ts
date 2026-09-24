import { txt } from '@/lib/text';
import type { ImportKeySpec } from '@/lib/data/import-plan';
import type { ThamHoiToChucImportRow } from './tham-hoi-to-chuc-import-row';

/** Bản ghi đã có — chỉ khoá chính + cột phạm vi. */
export interface ThamHoiToChucImportExisting {
  id: string;
  don_vi_tham_hoi_id: string | null;
}

/**
 * Chỉ có mã hệ thống: một cơ sở được thăm nhiều lần trong nhiều dịp, nên không
 * có tổ hợp cột tự nhiên nào định danh được một lượt thăm hỏi.
 */
export const THAM_HOI_TO_CHUC_IMPORT_KEYS: readonly ImportKeySpec<
  ThamHoiToChucImportExisting,
  ThamHoiToChucImportRow
>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
];
