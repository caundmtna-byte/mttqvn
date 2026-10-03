import { txt } from '@/lib/text';
import { chuanHoaKhoaVanBan, type ImportKeySpec } from '@/lib/data/import-plan';
import type { DonViCuuTroImportRow } from './don-vi-cuu-tro-import-row';

export interface DonViCuuTroImportExisting {
  id: string;
  ten: string;
}

export const DON_VI_CUU_TRO_IMPORT_KEYS: readonly ImportKeySpec<DonViCuuTroImportExisting, DonViCuuTroImportRow>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
  {
    // Unique index `uq_kho_don_vi_cuu_tro_ten_lower` — cùng cách chuẩn hoá.
    key: 'ten',
    label: txt('matTranDonViCuuTro.form.ten'),
    unique: true,
    ofExisting: (e) => chuanHoaKhoaVanBan(e.ten),
    ofRow: (r) => chuanHoaKhoaVanBan(r.values.ten),
  },
];
