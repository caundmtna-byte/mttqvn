import { z } from 'zod';
import { txt } from '@/lib/text';

export const tinhThanhSchema = z.object({
  ten: z
    .string()
    .trim()
    .min(2, txt('diaBan.validation.tenMin'))
    .max(255, txt('diaBan.validation.tenMax')),
  thu_tu: z.coerce.number().int().min(0),
});

export type TinhThanhFormValues = z.infer<typeof tinhThanhSchema>;

export const xaPhuongSchema = z.object({
  id_tinh_thanh: z.string().min(1, txt('diaBan.validation.tinhRequired')),
  ten: z
    .string()
    .trim()
    .min(2, txt('diaBan.validation.tenMin'))
    .max(255, txt('diaBan.validation.tenMax')),
  thu_tu: z.coerce.number().int().min(0),
});

export type XaPhuongFormValues = z.infer<typeof xaPhuongSchema>;
