function trimEnv(v: string | undefined): string {
  return typeof v === 'string' ? v.trim() : '';
}

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/** Đọc URL + anon key từ `import.meta.env` (đã trim). */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = trimEnv(import.meta.env.VITE_SUPABASE_URL as string | undefined);
  const anonKey = trimEnv(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/** True khi đủ `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`. */
export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() != null;
}

const CONFIG_ERROR =
  'Supabase chưa được cấu hình. Đặt VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local (xem .env.example).';

/** Throw nếu thiếu cấu hình Supabase — dùng trước auth/repository/API. */
export function assertSupabaseConfigured(): SupabaseEnv {
  const env = getSupabaseEnv();
  if (!env) throw new Error(CONFIG_ERROR);
  return env;
}
