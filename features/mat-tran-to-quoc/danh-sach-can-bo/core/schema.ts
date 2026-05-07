import { z } from 'zod';
import { txt } from '@/lib/text';
import { MTTQ_CAN_BO_GIOI_TINH } from './constants';

const optionalDate = z
  .string()
  .trim()
  .transform((s) => (s === '' ? undefined : s))
  .pipe(z.union([z.undefined(), z.string().min(1, txt('matTranCanBo.validation.dateInvalid'))]));

const optionalFkId = z
  .string()
  .optional()
  .transform((s) => {
    const t = (s ?? '').trim();
    return t === '' ? undefined : t;
  })
  .pipe(z.union([z.undefined(), z.string().min(1)]));

export const mttqCanBoSchema = z.object({
  cap_quan_ly_id: optionalFkId,
  to_chuc_id: optionalFkId,
  ho_ten: z.string().trim().min(1, txt('matTranCanBo.validation.hoTenRequired')),
  ngay_sinh: optionalDate,
  gioi_tinh: z.enum(MTTQ_CAN_BO_GIOI_TINH, { message: txt('matTranCanBo.validation.gioiTinhRequired') }),
  dan_toc_id: optionalFkId,
  ton_giao: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === '' ? undefined : s)),
  dia_chi: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === '' ? undefined : s)),
  dang_vien: z.boolean(),
  trinh_do_id: optionalFkId,
  ly_luan_chinh_tri_id: optionalFkId,
  dien_thoai: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === '' ? undefined : s)),
  chuc_vu_id: optionalFkId,
  ngay_tham_gia_to_chuc: optionalDate,
  trang_thai_id: optionalFkId,
  ngay_nhap_trang_thai: optionalDate,
});

export type MttqCanBoFormValues = z.infer<typeof mttqCanBoSchema>;
