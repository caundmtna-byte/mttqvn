import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from '@/lib/data/config';
import type { Database } from './database.types';

let supabaseInstance: SupabaseClient<Database> | null = null;

/**
 * Supabase client singleton. Trả null nếu thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 * Auth: PKCE + refresh token phù hợp SPA.
 */
export function getSupabase(): SupabaseClient<Database> | null {
  if (supabaseInstance !== null) return supabaseInstance;
  const env = getSupabaseEnv();
  if (!env) return null;
  supabaseInstance = createClient<Database>(env.url, env.anonKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: { 'x-client-info': 'mttqvn-web' },
    },
  });
  return supabaseInstance;
}
