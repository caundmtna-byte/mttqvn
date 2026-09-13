import { NDDK_TRANG_THAI_VALUES, type NddkTrangThai } from './constants';

/**
 * Trạng thái đòi quyền **Duyệt** (`phe_duyet`) mới đặt được.
 *
 * Chỉ 'Đã phê duyệt': đây là quyết định hành chính cho phép giải ngân. Bốn
 * trạng thái còn lại là ghi nhận tiến độ — người nhập liệu phải tự đẩy được,
 * nếu không thì luồng làm việc tắc ở mỗi bước.
 *
 * "Đã bàn giao" CỐ Ý không nằm ở đây: nó ghi nhận một việc đã xảy ra ngoài đời
 * (bàn giao nhà), không phải một quyết định cần ai phê.
 */
export const NDDK_TRANG_THAI_CAN_DUYET: readonly NddkTrangThai[] = ['Đã phê duyệt'];

export function nddkTrangThaiCanQuyenDuyet(trangThai: string | null | undefined): boolean {
  const t = (trangThai ?? '').trim();
  return NDDK_TRANG_THAI_CAN_DUYET.includes(t as NddkTrangThai);
}

/**
 * Danh sách trạng thái đổ ra hộp thoại "Chuyển trạng thái".
 *
 * **Đây là bản sao ở client của trigger `fn_nddk_kiem_quyen_phe_duyet`**
 * (`supabase/migrations/20260913103000_nddk_quyen_phe_duyet.sql`). DB mới là nơi
 * chặn thật; hàm này chỉ để hộp thoại không đổ ra lựa chọn chắc chắn bị từ
 * chối. Sửa một bên phải sửa cả bên kia.
 *
 * Module này KHÔNG có luật chuyển trạng thái cứng (xem CLAUDE.md): mọi bước
 * chuyển đều hợp lệ về nghiệp vụ. Bộ lọc duy nhất ở đây là bộ lọc QUYỀN.
 *
 * Trạng thái hiện tại luôn được giữ lại, nếu không hộp thoại mở ra với ô trống
 * và người dùng buộc phải đổi thứ gì đó mới đóng được.
 */
export function nddkTrangThaiChonDuoc(
  hienTai: string | null | undefined,
  coQuyenDuyet: boolean,
): readonly NddkTrangThai[] {
  const tu = (hienTai ?? '').trim();
  if (coQuyenDuyet) return NDDK_TRANG_THAI_VALUES;
  return NDDK_TRANG_THAI_VALUES.filter((v) => !nddkTrangThaiCanQuyenDuyet(v) || v === tu);
}
