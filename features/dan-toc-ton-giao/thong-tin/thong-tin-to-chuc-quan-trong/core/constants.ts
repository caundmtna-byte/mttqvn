import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';

export const LOAI_HINH_VALUES = ['Chùa', 'Giáo xứ', 'Nghĩa trang', 'Khác'] as const;
export type LoaiHinh = (typeof LOAI_HINH_VALUES)[number];

export const LOAI_HINH_DEFAULT: LoaiHinh = 'Chùa';

export const TRANG_THAI_HOAT_DONG_DEFAULT = TRANG_THAI_HOAT_DONG[1]; // 'Đang hoạt động'

export { TRANG_THAI_HOAT_DONG };
