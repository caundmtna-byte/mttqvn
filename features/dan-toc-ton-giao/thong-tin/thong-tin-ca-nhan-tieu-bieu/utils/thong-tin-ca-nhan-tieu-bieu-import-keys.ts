import { txt } from '@/lib/text';
import { chuanHoaKhoaVanBan, ghepKhoa, type ImportKeySpec } from '@/lib/data/import-plan';
import type { CaNhanTieuBieuImportRow } from './thong-tin-ca-nhan-tieu-bieu-import-row';

/** Bản ghi đã có — chỉ cột khoá + cột phạm vi, đủ để đối chiếu mà không tốn egress. */
export interface CaNhanTieuBieuImportExisting {
  id: string;
  ho_va_ten: string;
  ngay_sinh: string | null;
  don_vi_id: string | null;
}

export const CA_NHAN_TIEU_BIEU_IMPORT_KEYS: readonly ImportKeySpec<
  CaNhanTieuBieuImportExisting,
  CaNhanTieuBieuImportRow
>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
  {
    // Không có unique index dưới DB: hai người trùng tên và ngày sinh là chuyện
    // có thật. Khớp nhiều hồ sơ thì lõi báo lỗi thay vì đoán.
    key: 'ho_ten_ngay_sinh',
    label: txt('danTocCaNhanTieuBieu.import.keyHoTenNgaySinh'),
    unique: false,
    ofExisting: (e) => ghepKhoa(chuanHoaKhoaVanBan(e.ho_va_ten), e.ngay_sinh?.slice(0, 10)),
    ofRow: (r) => ghepKhoa(chuanHoaKhoaVanBan(r.values.ho_va_ten), r.values.ngay_sinh),
  },
];
