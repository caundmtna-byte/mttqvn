import { z } from 'zod';
import { txt } from '@/lib/text';
import { DOT_LOAI_VALUES, DOT_TRANG_THAI_VALUES } from './constants';

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((s) => s === '' || z.string().url().safeParse(s).success, txt('matTranDotCuuTro.validation.linkInvalid'));

const optionalDate = z
  .string()
  .trim()
  .refine((s) => s === '' || /^\d{4}-\d{2}-\d{2}$/.test(s), txt('matTranDotCuuTro.validation.ngayInvalid'));

export const khoDotCuuTroSchema = z
  .object({
    ten: z.string().trim().min(1, txt('matTranDotCuuTro.validation.tenRequired')),
    loai: z.enum(DOT_LOAI_VALUES, { message: txt('matTranDotCuuTro.validation.loaiInvalid') }),
    /** Một ô chọn: `DON_VI_GIOI_THIEU_TINH` | '<id xã>' — cùng quy ước Đơn vị giới thiệu. */
    don_vi_chu_tri: z.string().trim().min(1, txt('matTranDotCuuTro.validation.donViChuTriRequired')),
    tu_ngay: optionalDate,
    den_ngay: optionalDate,
    tai_khoan_tiep_nhan: z.string().trim().max(100),
    ngan_hang: z.string().trim().max(200),
    trang_thai: z.enum(DOT_TRANG_THAI_VALUES, { message: txt('matTranDotCuuTro.validation.trangThaiInvalid') }),
    tien_do: z.string().max(2000),
    mo_ta: z.string().max(50_000),
    link: optionalUrl,
  })
  // Khớp CHECK `kho_dot_cuu_tro_thoi_gian_chk`.
  .refine((v) => !v.tu_ngay || !v.den_ngay || v.den_ngay >= v.tu_ngay, {
    path: ['den_ngay'],
    message: txt('matTranDotCuuTro.validation.denNgayTruocTuNgay'),
  });

export type KhoDotCuuTroFormValues = z.infer<typeof khoDotCuuTroSchema>;
