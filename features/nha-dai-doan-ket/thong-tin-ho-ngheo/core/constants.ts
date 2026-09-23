/**
 * Danh mục nghiệp vụ của Thông tin hộ nghèo.
 *
 * Đây là nguồn sự thật phía client, đối chiếu 1-1 với CHECK trong
 * `supabase/migrations/20260921150000_hngh_thong_tin_ho_ngheo.sql`. Sửa một bên phải sửa cả bên kia.
 *
 * Các khoản hỗ trợ của hộ KHÔNG còn ở module này: bảng con `hngh_ho_tro_ct`
 * đã gộp vào Chương trình vì người nghèo (`vnn_chuong_trinh.ho_ngheo_id`).
 *
 * Riêng DÂN TỘC không nằm ở đây: nó là danh mục cơ quan tự quản trên màn
 * Thiết lập MTTQ (`mttq_thiet_lap`, `loai='dan_toc'`).
 */

/** Đối tượng hộ — dùng CHUNG bộ giá trị với Nhà đại đoàn kết. */
export const HNGH_DOI_TUONG_VALUES = ['Hộ nghèo', 'Cận nghèo', 'Khó khăn'] as const;
export type HnghDoiTuong = (typeof HNGH_DOI_TUONG_VALUES)[number];

/** Tôn giáo — chỉ ghi nhận hộ có theo tôn giáo hay không, không ghi tên. */
export const HNGH_TON_GIAO_VALUES = ['Có', 'Không'] as const;
export type HnghTonGiao = (typeof HNGH_TON_GIAO_VALUES)[number];
export const HNGH_TON_GIAO_DEFAULT: HnghTonGiao = 'Không';

/** Trạng thái hộ. Hai chiều đều hợp lệ — hộ đã thoát vẫn có thể tái nghèo. */
export const HNGH_TRANG_THAI_VALUES = ['Đang khó khăn', 'Hết khó khăn'] as const;
export type HnghTrangThai = (typeof HNGH_TRANG_THAI_VALUES)[number];
export const HNGH_TRANG_THAI_DEFAULT: HnghTrangThai = 'Đang khó khăn';
