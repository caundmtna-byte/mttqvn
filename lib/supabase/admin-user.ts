import { getSupabase } from './client';

/**
 * Wrapper SPA gọi Edge Function `admin-user` (xem `supabase/functions/admin-user`).
 * Mọi hàm yêu cầu admin đã đăng nhập (lấy JWT từ session hiện tại). Edge Function
 * sẽ tự kiểm tra quyền dựa trên `var_nhan_vien.trang_thai`.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Độ dài tối thiểu Edge Function chấp nhận cho mật khẩu admin tự đặt.
 *
 * Phải khớp `MIN_PASSWORD_LENGTH` trong `supabase/functions/admin-user/index.ts`:
 * chuỗi ngắn hơn KHÔNG bị từ chối mà bị Edge Function lặng lẽ thay bằng mật khẩu
 * ngẫu nhiên — admin tưởng đã đặt được mật khẩu mình gõ, thực tế thì không.
 */
export const MIN_ADMIN_PASSWORD_LENGTH = 8;

type AdminAction = 'check' | 'create' | 'reset_password' | 'delete';

interface AdminResponse {
  exists?: boolean;
  user_id?: string;
  deleted?: boolean;
  /** Mật khẩu do Edge Function sinh khi không truyền sẵn — chỉ trả về đúng một lần. */
  password?: string;
  /** `reset_password`: tài khoản Auth chưa có nên vừa được TẠO MỚI, không phải đổi. */
  created?: boolean;
  error?: string;
}

async function callAdminUser(action: AdminAction, username: string, extra?: { password?: string }): Promise<AdminResponse> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase chưa được cấu hình. Không thể gọi Edge Function.');
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client chưa được khởi tạo.');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/admin-user`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, username: username.trim().toLowerCase(), ...extra }),
  });
  let json: AdminResponse;
  try {
    json = (await res.json()) as AdminResponse;
  } catch {
    json = {};
  }
  if (!res.ok) {
    throw new Error(json.error ?? `admin-user ${action} thất bại (HTTP ${res.status})`);
  }
  return json;
}

export async function checkAuthUserExists(username: string): Promise<{ exists: boolean; user_id?: string }> {
  const res = await callAdminUser('check', username);
  return { exists: !!res.exists, user_id: res.user_id };
}

/** Tạo tài khoản Auth. Trả về mật khẩu hệ thống sinh (chỉ có đúng một lần) để admin đưa cho người dùng. */
export async function createAuthUser(username: string): Promise<{ password?: string }> {
  const res = await callAdminUser('create', username);
  return { password: res.password };
}

/**
 * Đặt lại mật khẩu.
 *
 * - Không truyền `password` ⇒ Edge Function sinh chuỗi ngẫu nhiên và trả về
 *   (chỉ có đúng một lần).
 * - Truyền `password` ⇒ dùng đúng chuỗi đó, và `password` trả về là `undefined`.
 *   Nếu chuỗi ngắn hơn {@link MIN_ADMIN_PASSWORD_LENGTH}, Edge Function bỏ qua
 *   và sinh ngẫu nhiên — nên phía gọi phải tự kiểm độ dài trước.
 * - `created = true` ⇒ tài khoản Auth chưa tồn tại và vừa được tạo mới với mật
 *   khẩu này (hồ sơ nhân viên có nhưng chưa bao giờ đăng nhập được).
 */
export async function resetAuthUserPassword(
  username: string,
  password?: string,
): Promise<{ password?: string; created?: boolean }> {
  const res = await callAdminUser('reset_password', username, password ? { password } : undefined);
  return { password: res.password, created: res.created };
}

export async function deleteAuthUser(username: string): Promise<void> {
  await callAdminUser('delete', username);
}
