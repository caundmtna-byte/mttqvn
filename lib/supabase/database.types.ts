/**
 * Placeholder lỏng cho `createClient<Database>()` — tránh `never` trên `.from()` / `.upsert()`
 * khi chưa chạy `supabase gen types`. Thay bằng schema đầy đủ khi ổn định pipeline.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

export type Json = any;

/** Tên bảng/view PostgREST — string cho tới khi gen types. */
export type PublicTableName = string;
