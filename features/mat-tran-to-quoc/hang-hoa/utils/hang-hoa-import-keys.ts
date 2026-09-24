import { txt } from '@/lib/text';
import { chuanHoaKhoaVanBan, ghepKhoa, type ImportKeySpec } from '@/lib/data/import-plan';
import type { DanhMucImportRow, HangHoaImportRow } from './hang-hoa-import-row';

/** Danh mục đã có — chỉ cột khoá + thứ tự (để đánh số tiếp). */
export interface DanhMucImportExisting {
  id: string;
  ten_danh_muc: string;
  thu_tu: number;
}

/** Hàng hóa đã có — chỉ cột khoá + thứ tự. */
export interface HangHoaImportExisting {
  id: string;
  id_danh_muc: string;
  ten_hang_hoa: string;
  thu_tu: number;
}

/** Khớp unique index `uq_kho_danh_muc_hang_hoa_ten_lower` — lower(trim(ten_danh_muc)). */
export const DANH_MUC_IMPORT_KEYS: readonly ImportKeySpec<DanhMucImportExisting, DanhMucImportRow>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
  {
    key: 'ten_danh_muc',
    label: txt('matTranHangHoa.import.colTenDanhMuc'),
    unique: true,
    ofExisting: (e) => chuanHoaKhoaVanBan(e.ten_danh_muc),
    ofRow: (r) => chuanHoaKhoaVanBan(r.ten_danh_muc),
  },
];

/** Khớp unique index `uq_kho_danh_sach_hang_hoa_dm_ten_lower` — (id_danh_muc, lower(trim(ten_hang_hoa))). */
export const HANG_HOA_IMPORT_KEYS: readonly ImportKeySpec<HangHoaImportExisting, HangHoaImportRow>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
  {
    key: 'danh_muc_ten_hang',
    label: txt('matTranHangHoa.import.keyDanhMucTenHang'),
    unique: true,
    ofExisting: (e) => ghepKhoa(e.id_danh_muc, chuanHoaKhoaVanBan(e.ten_hang_hoa)),
    ofRow: (r) => ghepKhoa(r.id_danh_muc, chuanHoaKhoaVanBan(r.ten_hang_hoa)),
  },
];
