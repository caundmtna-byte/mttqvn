import { isSupabase } from './config';
import type { IRepository } from './repository';
import { MockRepository } from './mock-repository';
import { SupabaseRepository } from './supabase-repository';

export interface CreateRepositoryConfig<T extends { id: string }> {
  tableName: string;
  mockData: T[];
  select?: string;
  delay?: number;
}

/**
 * Factory: returns MockRepository or SupabaseRepository based on VITE_DATA_SOURCE.
 */
export function createRepository<T extends { id: string }>(
  config: CreateRepositoryConfig<T>,
): IRepository<T> {
  if (isSupabase()) {
    return new SupabaseRepository<T>(config.tableName, { select: config.select });
  }
  return new MockRepository<T>(config.mockData, { delay: config.delay });
}
