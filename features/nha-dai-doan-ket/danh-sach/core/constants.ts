/**
 * Năm danh mục nghiệp vụ của Nhà đại đoàn kết.
 *
 * Module này **không có màn hình Thiết lập danh mục**, nên năm danh mục dưới đây
 * là hằng số trong code, đối chiếu 1-1 với `CHECK` constraint của bảng
 * `nddk_nha_dai_doan_ket`. Thêm/bớt một giá trị phải sửa cả hai nơi, nếu không
 * DB sẽ từ chối dòng mà giao diện vẫn cho chọn.
 */

export const NDDK_NGUON_VALUES = [
  'Vì người nghèo',
  'Cứu trợ',
  'Ngân sách',
  'Giới thiệu',
] as const;
export type NddkNguon = (typeof NDDK_NGUON_VALUES)[number];
export const NDDK_NGUON_DEFAULT: NddkNguon = 'Vì người nghèo';

export const NDDK_NGUON_HO_TRO_VALUES = [
  'Cấp tỉnh',
  'Cấp xã',
  'Ủng hộ trực tiếp',
  'Trung ương',
] as const;
export type NddkNguonHoTro = (typeof NDDK_NGUON_HO_TRO_VALUES)[number];
export const NDDK_NGUON_HO_TRO_DEFAULT: NddkNguonHoTro = 'Cấp tỉnh';

export const NDDK_DOI_TUONG_VALUES = ['Hộ nghèo', 'Cận nghèo', 'Khó khăn'] as const;
export type NddkDoiTuong = (typeof NDDK_DOI_TUONG_VALUES)[number];

/**
 * "Sửa chữa" là một LOẠI HÌNH HỖ TRỢ, không phải một module riêng — nhóm menu
 * trước đây có thẻ "Sửa chữa nâng cấp" đã được gỡ vì lý do này.
 */
export const NDDK_LOAI_HINH_VALUES = ['Xây mới', 'Sửa chữa'] as const;
export type NddkLoaiHinh = (typeof NDDK_LOAI_HINH_VALUES)[number];
export const NDDK_LOAI_HINH_DEFAULT: NddkLoaiHinh = 'Xây mới';

/** Thứ tự liệt kê theo vòng đời hồ sơ, không theo bảng chữ cái. */
export const NDDK_TRANG_THAI_VALUES = [
  'Đang khảo sát',
  'Đã phê duyệt',
  'Đang thực hiện',
  'Đã bàn giao',
  'Tạm dừng',
] as const;
export type NddkTrangThai = (typeof NDDK_TRANG_THAI_VALUES)[number];
export const NDDK_TRANG_THAI_DEFAULT: NddkTrangThai = 'Đang khảo sát';

/** Trạng thái coi là "đã xong" khi tính tỷ lệ bàn giao. */
export const NDDK_TRANG_THAI_HOAN_THANH: NddkTrangThai = 'Đã bàn giao';

/** Khoảng năm cho ô nhập và bộ lọc — khớp CHECK `nam BETWEEN 2000 AND 2100`. */
export const NDDK_NAM_MIN = 2000;
export const NDDK_NAM_MAX = 2100;

/** Hai tab của module — giữ mảng ở đây để `useTabSearchParam` memo ổn định. */
export type NddkMainTab = 'danh_sach' | 'thong_ke';
export const NDDK_MAIN_TABS = ['danh_sach', 'thong_ke'] as const satisfies readonly NddkMainTab[];
