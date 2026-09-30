/**
 * Danh mục nghiệp vụ của Thông tin đối tượng hỗ trợ.
 *
 * Đây là nguồn sự thật phía client, đối chiếu 1-1 với CHECK trong
 * `supabase/migrations/20260921150000_hngh_thong_tin_ho_ngheo.sql`. Sửa một bên phải sửa cả bên kia.
 *
 * Các khoản hỗ trợ của hộ KHÔNG còn ở module này: bảng con `hngh_ho_tro_ct`
 * đã gộp vào Chương trình hỗ trợ (`vnn_chuong_trinh.ho_ngheo_id`).
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

/** Tab của trang — hằng ở mức module để memo trong `useTabSearchParam` ổn định. */
export type HnghMainTab = 'danh_sach' | 'thong_ke';
export const HNGH_MAIN_TABS: readonly HnghMainTab[] = ['danh_sach', 'thong_ke'] as const;

/*
 * Nhân khẩu & đời sống — in ở phiếu khảo sát / biên bản bàn giao của Nhà đại
 * đoàn kết. Bản sao CHECK trong `20260928110000_nddk_bien_ban_in.sql`.
 */
export const HNGH_GIOI_TINH_VALUES = ['Nam', 'Nữ'] as const;
export type HnghGioiTinh = (typeof HNGH_GIOI_TINH_VALUES)[number];

export const HNGH_VIEC_LAM_VALUES = ['Có việc làm', 'Không có việc làm', 'Đang đi học'] as const;
export type HnghViecLam = (typeof HNGH_VIEC_LAM_VALUES)[number];

export const HNGH_TINH_TRANG_DAT_VALUES = ['Có GCN QSDĐ', 'Chưa có GCN QSDĐ'] as const;
export type HnghTinhTrangDat = (typeof HNGH_TINH_TRANG_DAT_VALUES)[number];

export const HNGH_NAM_SINH_MIN = 1900;
export const HNGH_NAM_SINH_MAX = 2100;
export const HNGH_SO_NHAN_KHAU_MAX = 100;
