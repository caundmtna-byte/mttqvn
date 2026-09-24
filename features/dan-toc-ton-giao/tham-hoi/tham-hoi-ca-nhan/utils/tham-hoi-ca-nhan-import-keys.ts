import { txt } from '@/lib/text';
import type { ImportKeySpec } from '@/lib/data/import-plan';
import type { ThamHoiCaNhanImportRow } from './tham-hoi-ca-nhan-import-row';

/** Bản ghi đã có — chỉ khoá chính + cột phạm vi. */
export interface ThamHoiCaNhanImportExisting {
  id: string;
  don_vi_tham_hoi_id: string | null;
  xa_phuong_id: string | null;
}

/**
 * Chỉ có mã hệ thống: một cá nhân được thăm nhiều lần trong nhiều dịp (và có thể
 * nhiều lần trong một dịp), nên không có tổ hợp cột tự nhiên nào định danh được
 * một lượt thăm hỏi.
 */
export const THAM_HOI_CA_NHAN_IMPORT_KEYS: readonly ImportKeySpec<
  ThamHoiCaNhanImportExisting,
  ThamHoiCaNhanImportRow
>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
];
