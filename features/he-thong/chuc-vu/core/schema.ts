import { z } from "zod";
import { txt } from '../../../../lib/text';
import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';

export const positionSchema = z.object({
  ten_chuc_vu: z.string()
    .trim()
    .min(3, txt('position.validation.nameMin'))
    .max(255, txt('position.validation.nameMax')),
  cap_bac: z.string().trim().min(1, txt('position.validation.levelRequired')),
  /** FK phòng ban — bắt buộc có trong schema (Zod strip key không khai báo → mất khi submit). */
  phong_ban_id: z.string().trim().min(1, txt('position.validation.departmentRequired')),
  mo_ta: z.string().max(500, txt('position.validation.descMax')).optional().nullable(),
  thu_tu: z.coerce.number().int().min(0),
  trang_thai: z.enum(TRANG_THAI_HOAT_DONG, { message: txt('position.validation.statusInvalid') }),
});

export type PositionFormValues = z.infer<typeof positionSchema>;
