import { getSupabase } from './client';

/**
 * Wrapper SPA gọi Edge Function `admin-user` (xem `supabase/functions/admin-user`).
 * Mọi hàm yêu cầu admin đã đăng nhập (lấy JWT từ session hiện tại). Edge Function
 * sẽ tự kiểm tra quyền dựa trên `var_nhan_vien.trang_thai`.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

type AdminAction = 'check' | 'create' | 'reset_password' | 'delete';

interface AdminResponse {
  exists?: boolean;
  user_id?: string;
  deleted?: boolean;
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
  let json: AdminResponse = {};
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

export async function createAuthUser(username: string): Promise<void> {
  await callAdminUser('create', username);
}

export async function resetAuthUserPassword(username: string): Promise<void> {
  await callAdminUser('reset_password', username);
}

export async function deleteAuthUser(username: string): Promise<void> {
  await callAdminUser('delete', username);
}
