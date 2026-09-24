import { txt } from '@/lib/text';
import { chuanHoaKhoaVanBan, ghepKhoa, type ImportKeySpec } from '@/lib/data/import-plan';
import type { HoNgheoImportRow } from './ho-ngheo-import-row';
import { chuanHoaSoCccd } from './so-cccd';

/** Bản ghi đã có — chỉ các cột khoá, đủ để đối chiếu mà không tốn egress. */
export interface HoNgheoImportExisting {
  id: string;
  so_cccd: string | null;
  ho_ten_dai_dien: string;
  xa_phuong_id: string | null;
}

export function khoaSoCccd(v: string | null | undefined): string | null {
  return chuanHoaSoCccd(v) || null;
}

export const HO_NGHEO_IMPORT_KEYS: readonly ImportKeySpec<HoNgheoImportExisting, HoNgheoImportRow>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
  {
    key: 'so_cccd',
    label: txt('hoNgheo.import.keySoCccd'),
    unique: true,
    ofExisting: (e) => khoaSoCccd(e.so_cccd),
    ofRow: (r) => khoaSoCccd(r.values.so_cccd),
  },
  {
    // Không unique: hai hộ cùng tên trong một xã là chuyện có thật. Khớp nhiều
    // hộ thì lõi báo lỗi thay vì đoán.
    key: 'ho_ten_xa',
    label: txt('hoNgheo.import.keyHoTenXa'),
    unique: false,
    ofExisting: (e) => ghepKhoa(chuanHoaKhoaVanBan(e.ho_ten_dai_dien), e.xa_phuong_id),
    ofRow: (r) => ghepKhoa(chuanHoaKhoaVanBan(r.values.ho_ten_dai_dien), r.values.xa_phuong_id),
  },
];
