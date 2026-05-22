import { z } from 'zod';
import { txt } from '@/lib/text';

export const khoDanhSachKhoSchema = z.object({
  ten_kho: z.string().trim().min(1, txt('matTranKhoDanhSach.validation.tenKhoRequired')),
  don_vi_id: z
    .string()
    .trim()
    .refine((s) => s === '' || /^\d+$/.test(s), txt('matTranKhoDanhSach.validation.donViInvalid')),
  mo_ta: z.string().max(10_000),
});

export type KhoDanhSachKhoFormValues = z.infer<typeof khoDanhSachKhoSchema>;
