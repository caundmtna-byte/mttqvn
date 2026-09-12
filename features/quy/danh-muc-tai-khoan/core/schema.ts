import { z } from 'zod';
import { txt } from '@/lib/text';
import { QUY_TRANG_THAI_KEYS } from '../../core/constants';

export const quyDanhMucTaiKhoanSchema = z.object({
  ten: z.string().trim().min(1, txt('quy.danhMucTaiKhoan.validation.tenRequired')),
  so_tai_khoan: z.string().max(100),
  ngan_hang: z.string().max(200),
  mo_ta: z.string().max(10_000),
  thu_tu: z
    .string()
    .trim()
    .refine(
      (s) => s === '' || /^\d{1,6}$/.test(s),
      txt('quy.danhMucTaiKhoan.validation.thuTuInvalid'),
    ),
  trang_thai: z.enum(QUY_TRANG_THAI_KEYS, {
    message: txt('quy.danhMucTaiKhoan.validation.trangThaiRequired'),
  }),
});

export type QuyDanhMucTaiKhoanFormValues = z.infer<typeof quyDanhMucTaiKhoanSchema>;
