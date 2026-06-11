export const TIEN_DO_VALUES = ['Chưa thực hiện', 'Đang thực hiện', 'Đã hoàn thành'] as const;
export type TienDoThamHoi = (typeof TIEN_DO_VALUES)[number];

export const TIEN_DO_DEFAULT: TienDoThamHoi = 'Chưa thực hiện';

/** Sentinel combobox — lưu DB `don_vi_tham_hoi_id = NULL` (MTTQ Tỉnh). */
export const DON_VI_THAM_HOI_TINH_VALUE = '__tinh_cap__';
export const DON_VI_THAM_HOI_TINH_LABEL = 'MTTQ Tỉnh';
