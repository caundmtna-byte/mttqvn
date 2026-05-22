/**
 * Placeholder lỏng cho `createClient<Database>()` — tránh `never` trên `.from()` / `.upsert()`
 * khi chưa chạy `supabase gen types`. Thay bằng schema đầy đủ khi ổn định pipeline.
 *
 * Bảng ứng dụng (migrations): `kho_danh_sach_kho` (`20260611130000_kho_danh_sach_kho.sql`,
 * `don_vi_id` nullable `20260611150000_kho_danh_sach_kho_don_vi_nullable.sql`,
 * cột `tt` tự tăng `20260611160000_kho_danh_sach_kho_tt.sql`);
 * `kho_danh_muc_hang_hoa`, `kho_danh_sach_hang_hoa` (`20260611140000_kho_hang_hoa.sql`);
 * `kho_don_vi_cuu_tro` (`20260611170000_kho_don_vi_cuu_tro.sql`);
 * `kho_dot_cuu_tro` (`20260611173000_kho_dot_cuu_tro.sql`);
 * `luong_thiet_lap_ngach_luong`, `luong_thiet_lap_bac_luong`, `luong_thiet_lap_cau_hinh` (`20260611180000_luong_thiet_lap.sql`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

export type Json = any;

/** Tên bảng/view PostgREST — string cho tới khi gen types. */
export type PublicTableName = string;
