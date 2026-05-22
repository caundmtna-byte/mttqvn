import { z } from 'zod';
import { txt } from '@/lib/text';

export const khoDonViCuuTroLoaiSchema = z.enum(['to_chuc', 'ca_nhan'], {
  message: txt('matTranDonViCuuTro.validation.loaiRequired'),
});

export const khoDonViCuuTroSchema = z.object({
  loai: khoDonViCuuTroLoaiSchema,
  ten: z.string().trim().min(1, txt('matTranDonViCuuTro.validation.tenRequired')),
  dia_chi: z.string().max(2000),
  dien_thoai: z.string().max(64),
  email: z
    .string()
    .trim()
    .max(320)
    .refine((s) => s === '' || z.string().email().safeParse(s).success, txt('matTranDonViCuuTro.validation.emailInvalid')),
  ghi_chu: z.string().max(10_000),
});

export type KhoDonViCuuTroFormValues = z.infer<typeof khoDonViCuuTroSchema>;
