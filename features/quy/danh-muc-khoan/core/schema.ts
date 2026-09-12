import { z } from 'zod';
import { txt } from '@/lib/text';
import { QUY_LOAI_KEYS, QUY_TRANG_THAI_KEYS } from '../../core/constants';

export const quyDanhMucKhoanSchema = z.object({
  loai: z.enum(QUY_LOAI_KEYS, {
    message: txt('quy.danhMucKhoan.validation.loaiRequired'),
  }),
  ten: z.string().trim().min(1, txt('quy.danhMucKhoan.validation.tenRequired')),
  mo_ta: z.string().max(10_000),
  thu_tu: z
    .string()
    .trim()
    .refine(
      (s) => s === '' || /^\d{1,6}$/.test(s),
      txt('quy.danhMucKhoan.validation.thuTuInvalid'),
    ),
  trang_thai: z.enum(QUY_TRANG_THAI_KEYS, {
    message: txt('quy.danhMucKhoan.validation.trangThaiRequired'),
  }),
});

export type QuyDanhMucKhoanFormValues = z.infer<typeof quyDanhMucKhoanSchema>;
