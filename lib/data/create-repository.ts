import type { PublicTableName } from '@/lib/supabase/database.types';
import type { IRepository } from './repository';
import { SupabaseRepository } from './supabase-repository';

export interface CreateRepositoryConfig {
  tableName: PublicTableName;
  select?: string;
}

/** Factory: luôn trả SupabaseRepository (cần VITE_SUPABASE_* trong .env.local). */
export function createRepository<T extends { id: string }>(
  config: CreateRepositoryConfig,
): IRepository<T> {
  return new SupabaseRepository<T>(config.tableName, { select: config.select });
}
