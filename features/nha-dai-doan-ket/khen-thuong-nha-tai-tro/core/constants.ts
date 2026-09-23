/**
 * Danh mục nghiệp vụ của Khen thưởng nhà tài trợ.
 *
 * Nguồn sự thật phía client, đối chiếu 1-1 với CHECK trong
 * `supabase/migrations/20260923110000_ktnt_khen_thuong_nha_tai_tro.sql`.
 * Sửa một bên phải sửa cả bên kia.
 */

export const KTNT_CAP_KHEN_VALUES = ['Trung ương', 'Cấp tỉnh', 'Cấp xã'] as const;
export type KtntCapKhen = (typeof KTNT_CAP_KHEN_VALUES)[number];
export const KTNT_CAP_KHEN_DEFAULT: KtntCapKhen = 'Cấp tỉnh';
/** Cấp duy nhất bắt buộc chọn xã — khớp CHECK `ktnt_xa_phuong_theo_cap_chk`. */
export const KTNT_CAP_KHEN_XA: KtntCapKhen = 'Cấp xã';

/** Thứ tự theo vòng đời hồ sơ. Luật chuyển ở `utils/luat-trang-thai.ts`. */
export const KTNT_TRANG_THAI_VALUES = ['Chờ duyệt', 'Đã duyệt', 'Không duyệt', 'Hủy'] as const;
export type KtntTrangThai = (typeof KTNT_TRANG_THAI_VALUES)[number];
export const KTNT_TRANG_THAI_DEFAULT: KtntTrangThai = 'Chờ duyệt';

/** Hai trạng thái là QUYẾT ĐỊNH của người duyệt — đòi token `phe_duyet`. */
export const KTNT_TRANG_THAI_CAN_DUYET: readonly KtntTrangThai[] = ['Đã duyệt', 'Không duyệt'];

export const KTNT_NAM_MIN = 2000;
export const KTNT_NAM_MAX = 2100;

export type KtntMainTab = 'danh_sach' | 'thong_ke';
export const KTNT_MAIN_TABS = ['danh_sach', 'thong_ke'] as const satisfies readonly KtntMainTab[];
