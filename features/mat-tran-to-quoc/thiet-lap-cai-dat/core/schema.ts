import { z } from 'zod';
import { txt } from '@/lib/text';
import { MTTQ_THIET_LAP_LOAI, type MttqThietLapLoai } from './types';

const loaiEnum = z.enum(MTTQ_THIET_LAP_LOAI as unknown as [MttqThietLapLoai, ...MttqThietLapLoai[]]);

export const mttqThietLapSchema = z.object({
  loai: loaiEnum,
  ten: z.string().trim().min(1, txt('page.matTranThietLap.validation.tenRequired')),
  mo_ta: z.string().nullable().optional(),
  thu_tu: z.coerce.number().int().min(0),
});

export type MttqThietLapFormValues = z.infer<typeof mttqThietLapSchema>;
