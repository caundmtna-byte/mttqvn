import { txt } from '@/lib/text';
import { chuanHoaKhoaVanBan, ghepKhoa, type ImportKeySpec } from '@/lib/data/import-plan';
import type { CanBoImportRow } from './can-bo-import-row';

/** Cán bộ đã có — chỉ cột khoá + `don_vi_id` (phạm vi xã phường). */
export interface CanBoImportExisting {
  id: string;
  ho_ten: string;
  ngay_sinh: string | null;
  don_vi_id: string | null;
}

export const CAN_BO_IMPORT_KEYS: readonly ImportKeySpec<CanBoImportExisting, CanBoImportRow>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
  {
    // Không có unique index: hai người trùng họ tên và ngày sinh là có thật.
    // Khớp nhiều hồ sơ thì lõi báo lỗi, không đoán.
    key: 'ho_ten_ngay_sinh',
    label: txt('matTranCanBo.import.keyHoTenNgaySinh'),
    unique: false,
    ofExisting: (e) => ghepKhoa(chuanHoaKhoaVanBan(e.ho_ten), e.ngay_sinh),
    ofRow: (r) => ghepKhoa(chuanHoaKhoaVanBan(r.values.ho_ten), r.values.ngay_sinh),
  },
];
