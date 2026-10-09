/**
 * Luật tiền của Chương trình hỗ trợ — bản sao `so_tien NOT NULL` dưới DB
 * (migration `20261009110000_vnn_so_tien_la_gia_tri_khoan`). Sửa một bên phải sửa cả bên kia.
 *
 * `so_tien` là GIÁ TRỊ của khoản: tiền mặt, hoặc hiện vật quy ra tiền. Mọi hình
 * thức, mọi trạng thái đều phải nhập (được nhập 0). Hiện vật chỉ thêm Số lượng.
 * Trả về danh sách ô còn thiếu (rỗng = hợp lệ).
 */
export type VnnOTien = 'so_tien';

export function vnnOTienCanNhap(v: { so_tien?: number | null }): VnnOTien[] {
  return typeof v.so_tien === 'number' && !Number.isNaN(v.so_tien) ? [] : ['so_tien'];
}
