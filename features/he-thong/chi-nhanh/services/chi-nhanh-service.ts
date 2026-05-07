import type { Branch } from '../core/types';

/** Chi nhánh chưa nối Supabase — trả rỗng. */
export async function getBranches(): Promise<Branch[]> {
  return [];
}
