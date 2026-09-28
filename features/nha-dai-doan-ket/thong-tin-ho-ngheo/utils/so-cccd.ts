/**
 * Chuẩn hoá số căn cước trước khi so trùng.
 *
 * Phải khớp ĐÚNG trigger `fn_hngh_chuan_hoa()` (migration 20260921150600): bóc
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
 * Căn cước công dân gắn chip: đúng 12 chữ số. Khớp CHECK `hngh_so_cccd_chk`
 * dưới DB (so trên giá trị đã chuẩn hoá, nên gõ cách quãng vẫn hợp lệ).
 */
export const SO_CCCD_REGEX = /^\d{12}$/;

/** Rỗng ⇒ hợp lệ (hộ chưa có giấy tờ); đã nhập thì phải đủ 12 chữ số. */
export function soCccdHopLe(raw: string | null | undefined): boolean {
  const v = chuanHoaSoCccd(raw);
  return v === '' || SO_CCCD_REGEX.test(v);
}
