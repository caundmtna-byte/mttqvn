import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';
import type { Json, PublicTableName } from '@/lib/supabase/database.types';
import type { IRepository, RepositoryMutationOptions, RepositoryQueryOptions } from './repository';

/**
 * @deprecated Không còn dùng làm trần cắt dữ liệu.
 *
 * `getAll()` nay luôn đọc ĐỦ số dòng: cắt ngầm làm danh sách hiển thị thiếu và
 * báo cáo ra số sai mà không có dấu hiệu gì. Việc chặn truy vấn quên bộ lọc do
 * `FETCH_ALL_PAGES_SAFETY_LIMIT` lo, và nó **ném lỗi** chứ không cắt.
 *
 * Bảng lớn thì cách trị đúng là RPC phân trang phía máy chủ
 * (xem mục "Chọn kiểu phân trang" trong CLAUDE.md), không phải giới hạn số dòng.
 */
export const SUPABASE_DEFAULT_MAX_ROWS = 5_000;

function ensureClient() {
  const client = getSupabase();
  if (!client) throw new Error('Supabase client is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  return client;
}

/**
 * Supabase-backed repository implementing IRepository.
 * Supports optional select string for relation queries (e.g. '*, phong_ban(ten_phong_ban)').
 */
export class SupabaseRepository<T extends { id: string }> implements IRepository<T> {
  constructor(
    private readonly tableName: PublicTableName,
    private readonly options?: { select?: string },
  ) {}

  private get select() {
    return this.options?.select ?? '*';
  }

  private mutationSelect(opts?: RepositoryMutationOptions): string {
    return opts?.returningSelect ?? this.select;
  }

  async getAll(options?: RepositoryQueryOptions): Promise<T[]> {
    const supabase = ensureClient();
    const offset = options?.offset ?? 0;
    const limit = options?.limit;

    const buildQuery = () => {
      let query = supabase.from(this.tableName).select(this.select);
      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending !== false });
      }
      return query;
    };

    if (limit != null) {
      const { data, error } = await buildQuery().range(offset, offset + limit - 1);
      if (error) handleSupabaseError(error);
      return (data ?? []) as unknown as T[];
    }

    // Không có `limit` ⇒ đọc ĐỦ cả bảng (lặp 1000 dòng mỗi request).
    // (Nhánh này bỏ qua `offset` — giữ nguyên hành vi cũ; dùng `limit` nếu cần phân trang.)
    // fetchAllPages cảnh báo khi bảng đã lớn và NÉM LỖI nếu vượt ngưỡng an toàn.
    const rows = await fetchAllPages<unknown>(
      async (from, to) => {
        const { data, error } = await buildQuery().range(from, to);
        if (error) handleSupabaseError(error);
        return (data ?? []) as unknown[];
      },
      { label: this.tableName },
    );
    return rows as T[];
  }

  async getById(id: string): Promise<T | null> {
    const supabase = ensureClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.select)
      .eq('id', id)
      .maybeSingle();
    if (error) handleSupabaseError(error);
    return data as unknown as T | null;
  }

  async insert(row: Omit<T, 'id'> & { id?: string }, opts?: RepositoryMutationOptions): Promise<T> {
    const supabase = ensureClient();
    const payload = { ...row } as Record<string, Json>;
    if (payload.id === undefined) delete payload.id;
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(payload)
      .select(this.mutationSelect(opts))
      .single();
    if (error) handleSupabaseError(error);
    return data as unknown as T;
  }

  async update(id: string, partial: Partial<T>, opts?: RepositoryMutationOptions): Promise<T> {
    const supabase = ensureClient();
    const payload = { ...partial } as Record<string, Json>;
    delete payload.id;

    const expected = opts?.expectedTgCapNhat;
    let query = supabase.from(this.tableName).update(payload).eq('id', id);
    // Chống ghi đè đồng thời: chỉ ghi khi bản ghi vẫn đúng mốc lúc người dùng mở form.
    if (expected) query = query.eq('tg_cap_nhat', expected);

    const { data, error } = await query.select(this.mutationSelect(opts)).maybeSingle();
    if (error) handleSupabaseError(error);

    if (!data) {
      if (expected) throw new Error(await this.moTaXungDotGhi(id));
      throw new Error(
        'Không tìm thấy bản ghi để cập nhật. Có thể bản ghi đã bị người khác xoá — hãy tải lại trang.',
      );
    }
    return data as unknown as T;
  }

  /**
   * Phân biệt "người khác vừa sửa" với "bản ghi đã bị xoá" — hai việc cần hai
   * cách xử lý khác nhau, nói chung chung thì cán bộ không biết phải làm gì.
   */
  private async moTaXungDotGhi(id: string): Promise<string> {
    const supabase = ensureClient();
    const { data } = await supabase.from(this.tableName).select('id').eq('id', id).maybeSingle();
    return data
      ? 'Bản ghi vừa được người khác sửa. Hãy tải lại để xem nội dung mới nhất rồi nhập lại thay đổi của bạn.'
      : 'Bản ghi đã bị người khác xoá. Hãy tải lại trang.';
  }

  async remove(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const supabase = ensureClient();
    const { error } = await supabase.from(this.tableName).delete().in('id', ids);
    if (error) handleSupabaseError(error);
  }

  async upsert(rows: (Omit<T, 'id'> & { id?: string }) | ((Omit<T, 'id'> & { id?: string })[])): Promise<T[]> {
    const supabase = ensureClient();
    const arr = Array.isArray(rows) ? rows : [rows];
    const payload = arr.map((r) => ({ ...r } as Record<string, Json>));
    const { data, error } = await supabase
      .from(this.tableName)
      .upsert(payload, { onConflict: 'id' })
      .select(this.select);
    if (error) handleSupabaseError(error);
    return (data ?? []) as unknown as T[];
  }
}
