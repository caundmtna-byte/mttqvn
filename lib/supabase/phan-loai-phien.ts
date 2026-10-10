import { isAuthRetryableFetchError } from '@supabase/supabase-js';

/**
 * Phân loại phiên đăng nhập: hợp lệ / mất hẳn / chưa xác định được.
 *
 * Trước đây mọi lỗi tra hồ sơ (mất mạng, timeout, 5xx, 401 lúc token đang làm mới)
 * đều bị coi là "không còn hồ sơ" ⇒ đăng xuất. Việc tra này chạy mỗi lần quay lại tab
 * và mỗi lần làm mới token, nên mở laptop sau khi ngủ (Wi-Fi chưa kịp lên) là văng.
 * Chỉ `mat_phien` mới được phép đẩy người dùng ra; `chua_xac_dinh` thì giữ nguyên,
 * lần kiểm sau sẽ xác định lại.
 */
export type TrangThaiPhien = 'hop_le' | 'mat_phien' | 'chua_xac_dinh';

export type KetQuaTraHoSo<T> =
  | { loai: 'tim_thay'; hoSo: T }
  | { loai: 'khong_co' }
  | { loai: 'loi' };

/** `getSession()` trả lỗi: lỗi mạng tạm thời thì token vẫn còn trong storage, chưa phải mất phiên. */
export function phanLoaiLoiSession(error: unknown): TrangThaiPhien {
  return isAuthRetryableFetchError(error) ? 'chua_xac_dinh' : 'mat_phien';
}

/** Không còn hồ sơ nhân viên hoặc tài khoản bị khoá ⇒ mất phiên; lỗi tra cứu ⇒ chưa xác định. */
export function phanLoaiHoSo(ketQua: KetQuaTraHoSo<{ trang_thai: string }>): TrangThaiPhien {
  if (ketQua.loai === 'loi') return 'chua_xac_dinh';
  if (ketQua.loai === 'khong_co') return 'mat_phien';
  return ketQua.hoSo.trang_thai === 'Khóa' ? 'mat_phien' : 'hop_le';
}
