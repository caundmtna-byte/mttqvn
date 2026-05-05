import { z } from "zod";
import { txt } from '../../../../lib/text';
import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';

export const positionSchema = z.object({
  ten_chuc_vu: z.string()
    .trim()
    .min(3, txt('position.validation.nameMin'))
    .max(255, txt('position.validation.nameMax')),
  cap_bac: z.string().optional().nullable(),
  phong_ban_id: z.string().optional().nullable(),
  mo_ta: z.string().max(500, txt('position.validation.descMax')).optional().nullable(),
  thu_tu: z.coerce.number().int().min(0),
  trang_thai: z.enum(TRANG_THAI_HOAT_DONG, { message: txt('position.validation.statusInvalid') }),
});

export type PositionFormValues = z.infer<typeof positionSchema>;
