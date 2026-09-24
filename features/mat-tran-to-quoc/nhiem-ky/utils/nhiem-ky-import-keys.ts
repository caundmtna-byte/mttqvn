import { txt } from '@/lib/text';
import { chuanHoaKhoaVanBan, type ImportKeySpec } from '@/lib/data/import-plan';
import type { NhiemKyImportRow } from './nhiem-ky-import-row';

export interface NhiemKyImportExisting {
  id: string;
  ten_nhiem_ky: string;
}

export const NHIEM_KY_IMPORT_KEYS: readonly ImportKeySpec<NhiemKyImportExisting, NhiemKyImportRow>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
  {
    // DB không có unique index trên tên nhiệm kỳ: khớp nhiều bản ghi thì lõi báo lỗi.
    key: 'ten_nhiem_ky',
    label: txt('matTranNhiemKy.store.tenCol'),
    unique: false,
    ofExisting: (e) => chuanHoaKhoaVanBan(e.ten_nhiem_ky),
    ofRow: (r) => chuanHoaKhoaVanBan(r.ten_nhiem_ky),
  },
];
