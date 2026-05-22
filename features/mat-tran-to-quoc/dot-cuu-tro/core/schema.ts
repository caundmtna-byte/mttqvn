import { z } from 'zod';
import { txt } from '@/lib/text';

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((s) => s === '' || z.string().url().safeParse(s).success, txt('matTranDotCuuTro.validation.linkInvalid'));

export const khoDotCuuTroSchema = z.object({
  ten: z.string().trim().min(1, txt('matTranDotCuuTro.validation.tenRequired')),
  mo_ta: z.string().max(50_000),
  link: optionalUrl,
});

export type KhoDotCuuTroFormValues = z.infer<typeof khoDotCuuTroSchema>;
