/**
 * Data source configuration for switching between mock and Supabase.
 * Set VITE_DATA_SOURCE=supabase to use Supabase; default is mock.
 */
export type DataSource = 'mock' | 'supabase';

const DATA_SOURCE = (import.meta.env.VITE_DATA_SOURCE as string | undefined) ?? 'mock';

export function getDataSource(): DataSource {
  return DATA_SOURCE === 'supabase' ? 'supabase' : 'mock';
}

export function isSupabase(): boolean {
  return getDataSource() === 'supabase';
}

export function isMock(): boolean {
  return getDataSource() === 'mock';
}
