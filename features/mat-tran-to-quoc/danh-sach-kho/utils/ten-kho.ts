/**
 * Tên kho gắn xã/phường: "Xã Yên Hòa" → "MTTQ xã Yên Hòa".
 * Bản sao của `fn_ten_kho_theo_xa()` dưới DB — DB mới là nơi gán thật (trigger),
 * hàm này chỉ để form hiện trước tên sẽ lưu. Sửa một bên phải sửa cả bên kia.
 */
export function tenKhoTheoXa(tenXa: string | null | undefined): string | null {
  const t = (tenXa ?? '').trim().replace(/\s+/g, ' ');
  if (t === '') return null;
  return `MTTQ ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
}
