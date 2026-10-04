/**
 * Danh mục nghiệp vụ của Chương trình vận động — đối chiếu 1-1 với CHECK của bảng
 * `kho_dot_cuu_tro` (migration `20261004110000_kho_dot_cuu_tro_chuong_trinh_van_dong`).
 * `constants.test.ts` đọc `supabase/schema.sql` để giữ hai bên khớp nhau.
 */
export const DOT_LOAI_VALUES = ['Nghĩa tình dòng Lam', 'Cứu trợ'] as const;
export type DotLoai = (typeof DOT_LOAI_VALUES)[number];
export const DOT_LOAI_DEFAULT: DotLoai = 'Cứu trợ';

export const DOT_TRANG_THAI_VALUES = ['Đang triển khai', 'Kết thúc'] as const;
export type DotTrangThai = (typeof DOT_TRANG_THAI_VALUES)[number];
export const DOT_TRANG_THAI_DANG_TRIEN_KHAI: DotTrangThai = 'Đang triển khai';
