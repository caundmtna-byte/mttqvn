/**
 * Chuẩn hoá số căn cước trước khi so trùng.
 *
 * Phải khớp ĐÚNG trigger `fn_hngh_chuan_hoa()` dưới DB: bóc
 * MỌI khoảng trắng, kể cả ở giữa — cách gõ "040 012 345 678" rất phổ biến. Chỉ
 * cắt hai đầu thì giao diện bảo hai số khác nhau còn DB báo trùng khoá.
 */
export function chuanHoaSoCccd(raw: string | null | undefined): string {
  return String(raw ?? '').replace(/\s+/g, '');
}

/** Rỗng (hoặc chỉ toàn khoảng trắng) ⇒ không tham gia kiểm trùng. */
export function soCccdCoGiaTri(raw: string | null | undefined): boolean {
  return chuanHoaSoCccd(raw) !== '';
}

/**
 * Căn cước công dân 12 chữ số, HOẶC chứng minh nhân dân cũ 9 chữ số — nhiều hộ
 * vẫn chỉ có CMND. Khớp CHECK `hngh_so_cccd_chk` dưới DB (so trên giá trị đã
 * chuẩn hoá, nên gõ cách quãng vẫn hợp lệ). Sửa một bên phải sửa cả bên kia.
 */
export const SO_CCCD_REGEX = /^(\d{9}|\d{12})$/;

/** Rỗng ⇒ hợp lệ (hộ chưa có giấy tờ); đã nhập thì phải đủ 9 hoặc 12 chữ số. */
export function soCccdHopLe(raw: string | null | undefined): boolean {
  const v = chuanHoaSoCccd(raw);
  return v === '' || SO_CCCD_REGEX.test(v);
}
