/**
 * Chuẩn hoá số căn cước trước khi so trùng.
 *
 * Dưới DB, unique index so trên `btrim(so_cccd)`. Client phải chuẩn hoá y hệt,
 * nếu không người dùng gõ thừa một dấu cách sẽ thấy "trùng" ở DB mà giao diện
 * bảo là khác nhau.
 */
export function chuanHoaSoCccd(raw: string | null | undefined): string {
  return String(raw ?? '').trim();
}

/** Rỗng (hoặc chỉ toàn khoảng trắng) ⇒ không tham gia kiểm trùng. */
export function soCccdCoGiaTri(raw: string | null | undefined): boolean {
  return chuanHoaSoCccd(raw) !== '';
}
