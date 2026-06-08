import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';

export const DOI_TUONG_VALUES = ['Chức sắc', 'Người uy tín', 'Người có công'] as const;
export type DoiTuong = (typeof DOI_TUONG_VALUES)[number];

export const TRANG_THAI_HOAT_DONG_DEFAULT = TRANG_THAI_HOAT_DONG[1]; // 'Đang hoạt động'

export { TRANG_THAI_HOAT_DONG };
