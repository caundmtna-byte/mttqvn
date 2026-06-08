import { z } from 'zod';
import { txt } from '@/lib/text';
import { PBXH_THIET_LAP_LOAI, type PbxhThietLapLoai } from './types';

const loaiEnum = z.enum(PBXH_THIET_LAP_LOAI as unknown as [PbxhThietLapLoai, ...PbxhThietLapLoai[]]);

export const pbxhThietLapSchema = z.object({
  loai: loaiEnum,
  ten: z.string().trim().min(1, txt('page.pbxhThietLap.validation.tenRequired')),
  mo_ta: z.string().nullable().optional(),
  thu_tu: z.coerce.number().int().min(0),
});

export type PbxhThietLapFormValues = z.infer<typeof pbxhThietLapSchema>;
