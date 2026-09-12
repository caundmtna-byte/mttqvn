import { MTTQ_KHEN_THUONG_TRANG_THAI, type MttqKhenThuongTrangThai } from '../core/constants';

/**
 * Luật chuyển trạng thái của quyết định khen thưởng.
 *
 * **Đây là bản sao Ở CLIENT của trigger `fn_kiem_luat_trang_thai`**
 * (`supabase/migrations/20260729120000_lich_su_trang_thai.sql`). Cơ sở dữ liệu
 * mới là nơi chặn thật — hàm này chỉ để hộp thoại không đổ ra những lựa chọn
 * chắc chắn sẽ bị từ chối. Sửa luật ở một nơi thì phải sửa cả nơi kia; cặp test
 * `luat-trang-thai.test.ts` giữ hai bên khớp nhau.
 *
 * Vì sao chỉ khen thưởng có luật: đây là **quyết định hành chính**, đã ban hành
 * thì không lùi về nháp được. Công việc thì ngược lại — mở lại một việc đã hoàn
 * thành là chuyện bình thường trong điều hành, nên cố ý KHÔNG chặn.
 */
export function trangThaiKeTiepHopLe(
  hienTai: string | null | undefined
): readonly MttqKhenThuongTrangThai[] {
  const tu = (hienTai ?? '').trim();

  // Đã ban hành = đã phát hành quyết định ra ngoài: chỉ còn đường huỷ.
  if (tu === 'Đã ban hành') {
    return ['Đã ban hành', 'Hủy'];
  }

  // Đã huỷ thì không "sống lại" thành quyết định có hiệu lực; vẫn cho quay về
  // nháp để lập lại hồ sơ.
  if (tu === 'Hủy') {
    return MTTQ_KHEN_THUONG_TRANG_THAI.filter((v) => v !== 'Đã ban hành');
  }

  return MTTQ_KHEN_THUONG_TRANG_THAI;
}

/**
 * Lọc thêm theo quyền: chỉ người có quyền **Duyệt** mới được đưa hồ sơ sang
 * "Đã ban hành". Không có quyền thì vẫn đẩy được hồ sơ qua các bước nháp —
 * chặn cả nút đổi trạng thái sẽ làm tắc luồng nhập liệu bình thường.
 *
 * Trạng thái hiện tại luôn được giữ trong danh sách, nếu không thì hộp thoại
 * mở ra với ô trống và người dùng buộc phải đổi thứ gì đó.
 */
export function trangThaiChonDuoc(
  hienTai: string | null | undefined,
  coQuyenDuyet: boolean
): readonly MttqKhenThuongTrangThai[] {
  const hopLe = trangThaiKeTiepHopLe(hienTai);
  if (coQuyenDuyet) return hopLe;
  return hopLe.filter((v) => v !== 'Đã ban hành' || v === (hienTai ?? '').trim());
}
