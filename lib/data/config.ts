/**
 * Data source: dùng Supabase khi có đủ `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` (sau trim, không rỗng).
 * Ép mock toàn app: `VITE_FORCE_MOCK=true`, hoặc (deprecated) `VITE_DATA_SOURCE=mock`.
 */
export type DataSource = 'mock' | 'supabase';

function trimEnv(v: string | undefined): string {
  return typeof v === 'string' ? v.trim() : '';
}

function hasSupabaseCredentials(): boolean {
  const url = trimEnv(import.meta.env.VITE_SUPABASE_URL as string | undefined);
  const key = trimEnv(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  return Boolean(url && key);
}

/** Ép mock dù đã cấu hình URL/key (dev / tương thích `.env` cũ). */
function forceMock(): boolean {
  if (import.meta.env.VITE_FORCE_MOCK === 'true') return true;
  const legacy = (import.meta.env.VITE_DATA_SOURCE as string | undefined)?.trim().toLowerCase();
  if (legacy === 'mock') return true;
  return false;
}

export function getDataSource(): DataSource {
  if (forceMock()) return 'mock';
  return hasSupabaseCredentials() ? 'supabase' : 'mock';
}

export function isSupabase(): boolean {
  return getDataSource() === 'supabase';
}

export function isMock(): boolean {
  return getDataSource() === 'mock';
}
