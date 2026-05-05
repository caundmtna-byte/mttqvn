/**
 * Repository interface for data access.
 * Extends the concept from types/crud.ts with method names aligned to Supabase (insert, remove).
 */
export interface RepositoryQueryOptions {
  orderBy?: string;
  ascending?: boolean;
  /** Limit number of rows (Supabase: .range(offset, offset + limit - 1)) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/** Tùy chọn PostgREST: thu hẹp payload trả về sau insert/update (giảm egress). */
export interface RepositoryMutationOptions {
  /** Chuỗi `.select()` sau insert/update; mock repository bỏ qua. */
  returningSelect?: string;
}

export interface IRepository<
  T extends { id: string },
  TCreate = Omit<T, 'id'>,
  TUpdate = Partial<T>,
> {
  getAll(options?: RepositoryQueryOptions): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  insert(data: TCreate, options?: RepositoryMutationOptions): Promise<T>;
  update(id: string, data: TUpdate, options?: RepositoryMutationOptions): Promise<T>;
  remove(ids: string[]): Promise<void>;
  upsert?(data: TCreate | TCreate[]): Promise<T[]>;
}
