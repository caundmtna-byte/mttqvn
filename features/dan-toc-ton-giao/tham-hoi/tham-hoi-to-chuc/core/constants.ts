export const TIEN_DO_VALUES = ['Chưa thực hiện', 'Đang thực hiện', 'Đã hoàn thành'] as const;
export type TienDoThamHoi = (typeof TIEN_DO_VALUES)[number];

export const TIEN_DO_DEFAULT: TienDoThamHoi = 'Chưa thực hiện';
