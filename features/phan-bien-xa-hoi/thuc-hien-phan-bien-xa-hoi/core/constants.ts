export const TINH_TRANG_VALUES = [
  'Đang thực hiện',
  'Đã lập kế hoạch',
  'Đã hoàn thành',
  'Dự kiến',
  'Tạm dừng',
] as const;
export type TinhTrang = (typeof TINH_TRANG_VALUES)[number];
export const TINH_TRANG_DEFAULT: TinhTrang = 'Đã lập kế hoạch';

export const CAP_THUC_HIEN_VALUES = ['Cấp tỉnh', 'Cấp xã'] as const;
export type CapThucHien = (typeof CAP_THUC_HIEN_VALUES)[number];

export const LOAI_HINH_VALUES = ['Giám sát', 'Phản biện', 'Kiểm tra', 'Giám sát cộng đồng'] as const;
export type LoaiHinh = (typeof LOAI_HINH_VALUES)[number];
