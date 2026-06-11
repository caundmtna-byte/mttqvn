export const TRANG_THAI_VALUES = ['Chưa thực hiện', 'Đang thực hiện', 'Đã hoàn thành'] as const;
export type TrangThaiDipThamHoi = (typeof TRANG_THAI_VALUES)[number];
export const TRANG_THAI_DEFAULT: TrangThaiDipThamHoi = 'Chưa thực hiện';

/** UI sentinel — lưu DB don_vi_to_chuc_id = NULL (MTTQ Tỉnh) */
export const DON_VI_TINH_VALUE = '__tinh_cap__';
export const DON_VI_TINH_LABEL = 'MTTQ Tỉnh';
