import {
  KTNT_TRANG_THAI_CAN_DUYET,
  KTNT_TRANG_THAI_DEFAULT,
  type KtntTrangThai,
} from '../core/constants';

/**
 * Luật chuyển trạng thái của quyết định khen nhà tài trợ.
 *
 * **Bản sao Ở CLIENT của nhánh `ktnt_khen_thuong_nha_tai_tro` trong trigger
 * `fn_kiem_luat_trang_thai`** (`supabase/migrations/20260923111000_ktnt_luat_trang_thai.sql`).
 * DB mới là nơi chặn thật; hàm này chỉ để hộp thoại không đổ ra lựa chọn chắc
 * chắn bị từ chối. Sửa một bên phải sửa cả bên kia — `luat-trang-thai.test.ts`
 * đọc thẳng file migration để giữ hai bên khớp.
 */
export const KTNT_BUOC_CHUYEN: Readonly<Record<KtntTrangThai, readonly KtntTrangThai[]>> = {
  'Chờ duyệt': ['Đã duyệt', 'Không duyệt', 'Hủy'],
  // Không duyệt ⇒ bổ sung hồ sơ rồi nộp lại, hoặc bỏ hẳn.
  'Không duyệt': ['Chờ duyệt', 'Hủy'],
  // Đã duyệt là quyết định đã ra ngoài: chỉ còn đường huỷ.
  'Đã duyệt': ['Hủy'],
  // Đã huỷ thì lập quyết định mới.
  'Hủy': [],
};

/** Trạng thái hiện tại + các bước kế tiếp hợp lệ. Rỗng / lạ ⇒ coi như "Chờ duyệt". */
export function ktntTrangThaiKeTiep(hienTai: string | null | undefined): readonly KtntTrangThai[] {
  const raw = (hienTai ?? '').trim();
  const tu = (raw in KTNT_BUOC_CHUYEN ? raw : KTNT_TRANG_THAI_DEFAULT) as KtntTrangThai;
  return [tu, ...KTNT_BUOC_CHUYEN[tu]];
}

/**
 * Lọc thêm theo quyền Duyệt: thiếu `phe_duyet` thì không thấy "Đã duyệt" /
 * "Không duyệt" (trigger `fn_ktnt_kiem_quyen_phe_duyet` cũng chặn). Trạng thái
 * hiện tại luôn được giữ để ô chọn không bị trống.
 */
export function ktntTrangThaiChonDuoc(
  hienTai: string | null | undefined,
  coQuyenDuyet: boolean,
): readonly KtntTrangThai[] {
  const [tu, ...ke] = ktntTrangThaiKeTiep(hienTai);
  if (coQuyenDuyet) return [tu, ...ke];
  return [tu, ...ke.filter((v) => !KTNT_TRANG_THAI_CAN_DUYET.includes(v))];
}

/** Trạng thái được chọn ngay khi TẠO MỚI. */
export function ktntTrangThaiKhiTao(coQuyenDuyet: boolean): readonly KtntTrangThai[] {
  return ktntTrangThaiChonDuoc(KTNT_TRANG_THAI_DEFAULT, coQuyenDuyet).filter((v) => v !== 'Hủy');
}
