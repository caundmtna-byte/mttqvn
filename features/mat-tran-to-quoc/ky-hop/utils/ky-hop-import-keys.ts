import { txt } from '@/lib/text';
import { chuanHoaKhoaVanBan, ghepKhoa, type ImportKeySpec } from '@/lib/data/import-plan';
import type { KyHopImportRow } from './ky-hop-import-row';

/** Kỳ họp đã có — chỉ cột khoá + cột phạm vi (`don_vi_id`, `id_nguoi_tao`). */
export interface KyHopImportExisting {
  id: string;
  nhiem_ky_id: string;
  ky_thu: string;
  don_vi_id: string | null;
  id_nguoi_tao: string | null;
}

const khoaDonVi = (v: string | null | undefined) => v?.trim() || 'tinh';

export const KY_HOP_IMPORT_KEYS: readonly ImportKeySpec<KyHopImportExisting, KyHopImportRow>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
  {
    // Các đơn vị trong cùng nhiệm kỳ đều có "Kỳ thứ 1" nên phải ghép cả đơn vị
    // (`null` = cấp Tỉnh). Vẫn không unique dưới DB (`ky_thu` là chữ tự do) —
    // khớp nhiều kỳ họp thì lõi báo lỗi, không đoán.
    key: 'nhiem_ky_ky_thu',
    label: txt('matTranKyHop.import.keyNhiemKyKyThu'),
    unique: false,
    ofExisting: (e) => ghepKhoa(e.nhiem_ky_id, khoaDonVi(e.don_vi_id), chuanHoaKhoaVanBan(e.ky_thu)),
    ofRow: (r) => ghepKhoa(r.nhiem_ky_id, khoaDonVi(r.don_vi_id), chuanHoaKhoaVanBan(r.ky_thu)),
  },
];
