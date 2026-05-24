export const MTTQ_KHEN_THUONG_TRANG_THAI = ['Mới', 'Đang xử lý', 'Đã ban hành', 'Hủy'] as const;
export type MttqKhenThuongTrangThai = (typeof MTTQ_KHEN_THUONG_TRANG_THAI)[number];

export const MTTQ_KHEN_THUONG_HINH_THUC = ['Thường xuyên', 'Chuyên đề'] as const;
export type MttqKhenThuongHinhThuc = (typeof MTTQ_KHEN_THUONG_HINH_THUC)[number];

export const MTTQ_KHEN_THUONG_DANH_HIEU = ['Giấy khen', 'Bằng khen'] as const;
export type MttqKhenThuongDanhHieu = (typeof MTTQ_KHEN_THUONG_DANH_HIEU)[number];

export const MTTQ_KHEN_THUONG_CAP = ['Tỉnh', 'Trung ương', 'Xã'] as const;
export type MttqKhenThuongCap = (typeof MTTQ_KHEN_THUONG_CAP)[number];
