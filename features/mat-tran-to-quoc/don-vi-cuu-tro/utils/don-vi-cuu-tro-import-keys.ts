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
    // DB không có unique index trên tên (hai cá nhân trùng họ tên là có thật):
    // khớp nhiều bản ghi thì lõi báo lỗi, không đoán.
    key: 'ten',
    label: txt('matTranDonViCuuTro.form.ten'),
    unique: false,
    ofExisting: (e) => chuanHoaKhoaVanBan(e.ten),
    ofRow: (r) => chuanHoaKhoaVanBan(r.values.ten),
  },
];
