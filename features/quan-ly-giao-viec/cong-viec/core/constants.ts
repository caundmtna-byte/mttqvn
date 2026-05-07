export const CONG_VIEC_MUC_DO = ['Thấp', 'Trung bình', 'Cao', 'Khẩn'] as const;
export type CongViecMucDo = (typeof CONG_VIEC_MUC_DO)[number];

export const CONG_VIEC_TRANG_THAI = ['Mới', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng', 'Hủy'] as const;
export type CongViecTrangThai = (typeof CONG_VIEC_TRANG_THAI)[number];
