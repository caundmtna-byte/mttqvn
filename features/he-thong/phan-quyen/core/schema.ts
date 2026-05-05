import { z } from "zod";
import { txt } from '../../../../lib/text';
import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';

export const roleSchema = z.object({
  ma_vai_tro: z.string().min(2, txt('permission.validation.codeMin')).regex(/^[A-Z0-9_]+$/, txt('permission.validation.codeFormat')),
  ten_vai_tro: z.string().min(3, txt('permission.validation.nameMin')),
  mo_ta: z.string().max(200, txt('permission.validation.descMax')).optional().nullable(),
  trang_thai: z.enum(TRANG_THAI_HOAT_DONG),
});

export type RoleFormValues = z.infer<typeof roleSchema>;
