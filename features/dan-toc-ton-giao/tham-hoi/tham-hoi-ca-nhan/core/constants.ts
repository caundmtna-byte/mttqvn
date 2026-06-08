export const TRANG_THAI_VALUES = ['Chưa thực hiện', 'Đang thực hiện', 'Đã hoàn thành'] as const;
export type TrangThaiThamHoi = (typeof TRANG_THAI_VALUES)[number];

export const TRANG_THAI_DEFAULT: TrangThaiThamHoi = 'Chưa thực hiện';

/** Sentinel form value — lưu DB là NULL (CQMTTQ Tỉnh). */
export const DON_VI_THAM_HOI_CQMTTQ_VALUE = '__cqmttq_tinh__';
export const DON_VI_THAM_HOI_CQMTTQ_LABEL = 'CQMTTQ Tỉnh';

export const QUA_TANG_SEED_SUGGESTIONS = [
  'Quà tặng',
  'Quà & Lẵng hoa',
  'Quà & Tiền mặt',
  'Quà Tết',
] as const;

export const QUA_TANG_MAX_LENGTH = 200;
