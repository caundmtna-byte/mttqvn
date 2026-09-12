import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { APP_RESOURCE_TO_MODULE } from '@/lib/permissions';
import { coQuyenDatLaiMatKhau } from '../utils/mat-khau-quan-tri';

const MODULE_ID = APP_RESOURCE_TO_MODULE.employees ?? 'he-thong/nhan-vien';

/**
 * Được đặt lại mật khẩu cho NGƯỜI KHÁC hay không — chỉ dùng để ẩn/hiện nút.
 *
 * Luật khớp Edge Function `admin-user` (xem {@link coQuyenDatLaiMatKhau}), cố ý
 * KHÔNG dùng `useCan('edit','employees')`: sửa được hồ sơ không đồng nghĩa với
 * được chiếm tài khoản đăng nhập của người khác.
 */
export function useCanResetEmployeePassword(): boolean {
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  return coQuyenDatLaiMatKhau(chucVuCapBac, grantsByModule[MODULE_ID]);
}
