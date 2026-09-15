/**
 * Chuẩn hoá chuỗi tiếng Việt để SO KHỚP (không phải để hiển thị).
 *
 * Cần cho nhập liệu từ Excel: người dùng gõ "Ngay dang", "NGÀY ĐĂNG", "Ngày  đăng"
 * đều phải khớp cùng một cột, và tra danh mục theo tên cũng vậy. Trước đây
 * `ImportDialog` chỉ so `toLowerCase() + includes` nên hễ file gõ không dấu là
 * mất sạch auto-map, người dùng phải chọn tay từng cột.
 *
 * `lib/text/` là bảng chuỗi giao diện, không phải nơi để hàm — nên đặt ở đây.
 */

/** Bỏ dấu tiếng Việt, giữ nguyên chữ hoa/thường và khoảng trắng. */
export function boDauTiengViet(raw: string): string {
  return raw
    .normalize('NFD')
    // U+0300–U+036F là dải dấu thanh/dấu phụ tách ra sau NFD.
    .replace(/[̀-ͯ]/g, '')
    // đ/Đ không tách được bằng NFD vì là ký tự riêng, phải thay tay.
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Khoá so khớp: bỏ dấu, thường hoá, gộp mọi khoảng trắng thành một dấu cách,
 * cắt hai đầu. Trả '' cho giá trị rỗng/không đọc được.
 */
export function chuanHoaKhoaSoKhop(raw: unknown): string {
  if (raw == null) return '';
  return boDauTiengViet(String(raw)).replace(/\s+/g, ' ').trim().toLowerCase();
}
