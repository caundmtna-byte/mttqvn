import { txt } from '@/lib/text';
import { chuanHoaKhoaVanBan, type ImportKeySpec } from '@/lib/data/import-plan';
import type { ToChucQuanTrongImportRow } from './thong-tin-to-chuc-quan-trong-import-row';

/** Bản ghi đã có — chỉ cột khoá + cột phạm vi, đủ để đối chiếu mà không tốn egress. */
export interface ToChucQuanTrongImportExisting {
  id: string;
  ten_co_so: string;
  don_vi_id: string | null;
}

export const TO_CHUC_QUAN_TRONG_IMPORT_KEYS: readonly ImportKeySpec<
  ToChucQuanTrongImportExisting,
  ToChucQuanTrongImportRow
>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
  {
    // Không có unique index dưới DB: hai xã có chùa cùng tên là chuyện thường.
    // Khớp nhiều cơ sở thì lõi báo lỗi thay vì đoán.
    key: 'ten_co_so',
    label: txt('danTocToChucQuanTrong.import.keyTenCoSo'),
    unique: false,
    ofExisting: (e) => chuanHoaKhoaVanBan(e.ten_co_so),
    ofRow: (r) => chuanHoaKhoaVanBan(r.values.ten_co_so),
  },
];
