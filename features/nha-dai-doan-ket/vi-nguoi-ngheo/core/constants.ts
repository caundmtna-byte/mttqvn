import { NDDK_DOI_TUONG_VALUES, NDDK_NGUON_HO_TRO_VALUES } from '../../danh-sach/core/constants';

/**
 * Danh mục nghiệp vụ của Chương trình vì người nghèo.
 *
 * Nguồn sự thật phía client, đối chiếu 1-1 với CHECK trong
 * `supabase/migrations/20260923100000_vnn_chuong_trinh_vi_nguoi_ngheo.sql`.
 * Sửa một bên phải sửa cả bên kia, nếu không DB từ chối dòng mà giao diện vẫn
 * cho chọn.
 */

/**
 * Bộ HỢP NHẤT của mẫu nhập liệu mới (5 giá trị đầu) và bảng con hộ nghèo cũ
 * (`hngh_ho_tro_ct`, đã gộp vào đây). "Quà tết" cũ quy về "Tết vì người nghèo".
 */
export const VNN_LINH_VUC_VALUES = [
  'Tết vì người nghèo',
  'Cứu trợ',
  'Mô hình sinh kế',
  'Học sinh nghèo',
  'Chữa bệnh',
  'Nhà bị sập',
  'Người chết',
  'Hoả hoạn',
] as const;
export type VnnLinhVuc = (typeof VNN_LINH_VUC_VALUES)[number];
export const VNN_LINH_VUC_DEFAULT: VnnLinhVuc = 'Tết vì người nghèo';

/** Tập con của Nguồn bên Nhà đại đoàn kết (không có "Giới thiệu"). */
export const VNN_NGUON_VALUES = ['Vì người nghèo', 'Cứu trợ', 'Ngân sách'] as const;
export type VnnNguon = (typeof VNN_NGUON_VALUES)[number];
export const VNN_NGUON_DEFAULT: VnnNguon = 'Vì người nghèo';

/** Dùng CHUNG với Nhà đại đoàn kết để hai module cộng chung được trên báo cáo. */
export const VNN_NGUON_HO_TRO_VALUES = NDDK_NGUON_HO_TRO_VALUES;
export type VnnNguonHoTro = (typeof VNN_NGUON_HO_TRO_VALUES)[number];
export const VNN_NGUON_HO_TRO_DEFAULT: VnnNguonHoTro = 'Cấp tỉnh';

export const VNN_DOI_TUONG_VALUES = NDDK_DOI_TUONG_VALUES;
export type VnnDoiTuong = (typeof VNN_DOI_TUONG_VALUES)[number];

export const VNN_HINH_THUC_VALUES = ['Tiền mặt', 'Quà và Tiền', 'Quà'] as const;
export type VnnHinhThuc = (typeof VNN_HINH_THUC_VALUES)[number];
export const VNN_HINH_THUC_DEFAULT: VnnHinhThuc = 'Tiền mặt';

/**
 * Hai trạng thái, hai chiều đều hợp lệ và KHÔNG đòi quyền Duyệt: "Đã nhận"
 * ghi nhận việc tiền/quà đã trao tay, ghi nhầm thì phải lùi được.
 */
export const VNN_TRANG_THAI_VALUES = ['Đang khảo sát', 'Đã nhận'] as const;
export type VnnTrangThai = (typeof VNN_TRANG_THAI_VALUES)[number];
export const VNN_TRANG_THAI_DEFAULT: VnnTrangThai = 'Đang khảo sát';
export const VNN_TRANG_THAI_DA_NHAN: VnnTrangThai = 'Đã nhận';

/** Khớp CHECK `nam BETWEEN 2000 AND 2100`. */
export const VNN_NAM_MIN = 2000;
export const VNN_NAM_MAX = 2100;

/** Hai tab của module — giữ mảng ở đây để `useTabSearchParam` memo ổn định. */
export type VnnMainTab = 'danh_sach' | 'thong_ke';
export const VNN_MAIN_TABS = ['danh_sach', 'thong_ke'] as const satisfies readonly VnnMainTab[];
