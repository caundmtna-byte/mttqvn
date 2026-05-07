import { z } from 'zod';
import { txt } from '@/lib/text';
import { MTTQ_TAP_HUAN_CAP, MTTQ_TAP_HUAN_THUOC_DIEN } from './constants';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

/** Một dòng cán bộ tham gia lớp (dùng trong form cha + drawer dòng). */
export const mttqTapHuanChiTietLineSchema = z.object({
  id: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === '' ? undefined : s)),
  can_bo_id: z.string().trim().min(1, txt('matTranTapHuan.validation.canBoRequired')),
  chuc_vu: z.string().trim().min(1, txt('matTranTapHuan.validation.chucVuRequired')),
  don_vi_cong_tac: z.string().trim().min(1, txt('matTranTapHuan.validation.donViCongTacRequired')),
  thuoc_dien: z.enum(MTTQ_TAP_HUAN_THUOC_DIEN, {
    message: txt('matTranTapHuan.validation.thuocDienRequired'),
  }),
});

export type MttqTapHuanChiTietLineFormValues = z.infer<typeof mttqTapHuanChiTietLineSchema>;

export const mttqTapHuanSchema = z.object({
  ten_lop_tap_huan: z
    .string()
    .trim()
    .min(1, txt('matTranTapHuan.validation.tenLopRequired')),
  nam_tap_huan: z
    .coerce
    .number({ message: txt('matTranTapHuan.validation.namRequired') })
    .int(txt('matTranTapHuan.validation.namInvalid'))
    .min(2000, txt('matTranTapHuan.validation.namInvalid'))
    .max(2100, txt('matTranTapHuan.validation.namInvalid')),
  cap_tap_huan: z.enum(MTTQ_TAP_HUAN_CAP, {
    message: txt('matTranTapHuan.validation.capRequired'),
  }),
  ghi_chu: optionalText,
  chi_tiet: z
    .array(mttqTapHuanChiTietLineSchema)
    .min(1, txt('matTranTapHuan.validation.chiTietMin')),
});

export type MttqTapHuanFormValues = z.infer<typeof mttqTapHuanSchema>;
