import { txt } from '@/lib/text';
import { ghepKhoa, type ImportKeySpec } from '@/lib/data/import-plan';
import { normalizeMaUvForCompare } from './uy-vien-conflict';
import type { UyVienImportRow } from './uy-vien-import-row';

/** Ủy viên đã có — chỉ cột khoá + cột phạm vi (`don_vi_id`, `id_nguoi_tao`). */
export interface UyVienImportExisting {
  id: string;
  nhiem_ky_id: string;
  can_bo_id: string;
  ma_uv: string | null;
  don_vi_id: string | null;
  id_nguoi_tao: string | null;
}

/**
 * Cả hai khoá tự nhiên đều có unique index dưới DB:
 * `uq_mttq_uy_vien_uy_ban_nhiem_ky_can_bo` (nhiem_ky_id, can_bo_id) và
 * `uq_mttq_uy_vien_uy_ban_nhiem_ky_ma_uv` (nhiem_ky_id, lower(trim(ma_uv))) WHERE ma_uv <> ''.
 */
export const UY_VIEN_IMPORT_KEYS: readonly ImportKeySpec<UyVienImportExisting, UyVienImportRow>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
  {
    key: 'nhiem_ky_can_bo',
    label: txt('matTranUyVienUyBan.import.keyNhiemKyCanBo'),
    unique: true,
    ofExisting: (e) => ghepKhoa(e.nhiem_ky_id, e.can_bo_id),
    ofRow: (r) => ghepKhoa(r.nhiem_ky_id, r.can_bo_id),
  },
  {
    key: 'nhiem_ky_ma_uv',
    label: txt('matTranUyVienUyBan.import.keyNhiemKyMaUv'),
    unique: true,
    ofExisting: (e) => ghepKhoa(e.nhiem_ky_id, normalizeMaUvForCompare(e.ma_uv)),
    ofRow: (r) => ghepKhoa(r.nhiem_ky_id, normalizeMaUvForCompare(r.ma_uv)),
  },
];
