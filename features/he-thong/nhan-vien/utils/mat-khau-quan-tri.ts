import { MIN_ADMIN_PASSWORD_LENGTH } from '@/lib/supabase/admin-user';

export type LoiMatKhauQuanTri = 'trong' | 'quaNgan' | 'khongKhop' | 'coKhoangTrang';

export interface FormMatKhauQuanTri {
  matKhau: string;
  xacNhan: string;
}

/**
 * Kiểm tra mật khẩu quản trị viên đặt cho tài khoản NGƯỜI KHÁC.
 *
 * Bắt buộc kiểm ở client vì Edge Function `admin-user` KHÔNG từ chối mật khẩu
 * ngắn: chuỗi dưới {@link MIN_ADMIN_PASSWORD_LENGTH} ký tự bị nó lặng lẽ thay
 * bằng chuỗi ngẫu nhiên, nên nếu không chặn ở đây thì admin gõ "123456", hệ
 * thống báo thành công, còn người dùng thì không đăng nhập được bằng mật khẩu đó.
 *
 * Khoảng trắng đầu/cuối cũng bị chặn — không cắt ngầm, vì cắt đi là admin đọc
 * một đằng, hệ thống lưu một nẻo.
 */
export function kiemTraMatKhauQuanTri(form: FormMatKhauQuanTri): LoiMatKhauQuanTri | null {
  if (!form.matKhau) return 'trong';
  if (form.matKhau !== form.matKhau.trim()) return 'coKhoangTrang';
  if (form.matKhau.length < MIN_ADMIN_PASSWORD_LENGTH) return 'quaNgan';
  if (form.matKhau !== form.xacNhan) return 'khongKhop';
  return null;
}

/**
 * Ai được đặt lại mật khẩu của người khác — **bản sao luật của Edge Function**
 * `supabase/functions/admin-user/index.ts` (mục 2b): `var_chuc_vu.cap_bac = 1`
 * hoặc token `admin`/`all` (map từ `quan_tri`) trên module `he-thong/nhan-vien`.
 *
 * Ở đây chỉ để ẩn nút; Edge Function mới là nơi chặn thật. Cố ý KHÔNG có nhánh
 * "chưa hydrate ma trận thì cho qua" — deny-by-default, vì đây là quyền chiếm
 * được tài khoản người khác.
 */
export function coQuyenDatLaiMatKhau(
  capBac: number | null | undefined,
  quyenModuleNhanVien: readonly string[] | undefined,
): boolean {
  const n = Number(capBac);
  if (capBac != null && Number.isFinite(n) && n === 1) return true;
  const quyen = quyenModuleNhanVien ?? [];
  return quyen.includes('admin') || quyen.includes('all');
}
