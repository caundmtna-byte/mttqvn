import { z } from 'zod';
import type { MttqCanBo } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/types';
import { txt } from '@/lib/text';
import { MTTQ_TAP_HUAN_CAP, MTTQ_TAP_HUAN_THUOC_DIEN } from './constants';
import { tapHuanCanBoProfileComplete } from '../utils/snapshot-from-can-bo';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

/** Một dòng cán bộ tham gia lớp (dùng trong form cha + drawer dòng). Chỉ lưu FK + thuộc diện. */
export const mttqTapHuanChiTietLineSchema = z.object({
  id: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === '' ? undefined : s)),
  can_bo_id: z.string().trim().min(1, txt('matTranTapHuan.validation.canBoRequired')),
  thuoc_dien: z.enum(MTTQ_TAP_HUAN_THUOC_DIEN, {
    message: txt('matTranTapHuan.validation.thuocDienRequired'),
  }),
});

export type MttqTapHuanChiTietLineFormValues = z.infer<typeof mttqTapHuanChiTietLineSchema>;

const mttqTapHuanObject = z.object({
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
  /** FK xã/phường — bắt buộc khi `cap_tap_huan` = Cấp xã; để rỗng khi Cấp tỉnh. */
  don_vi_id: z.string(),
  ghi_chu: optionalText,
  chi_tiet: z
    .array(mttqTapHuanChiTietLineSchema)
    .min(1, txt('matTranTapHuan.validation.chiTietMin')),
});

/** Schema validate form; truyền danh sách cán bộ để kiểm tra hồ sơ đủ chức vụ + tổ chức/phòng ban. */
export function createMttqTapHuanSchema(canBoList: readonly MttqCanBo[]) {
  const canBoMap = new Map(canBoList.map((c) => [String(c.id), c]));
  return mttqTapHuanObject
    .superRefine((data, ctx) => {
      if (data.cap_tap_huan === 'Cấp xã' && data.don_vi_id.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: txt('matTranTapHuan.validation.donViRequired'),
          path: ['don_vi_id'],
        });
      }
    })
    .superRefine((data, ctx) => {
      if (canBoMap.size === 0) return;
      for (let i = 0; i < data.chi_tiet.length; i++) {
        const line = data.chi_tiet[i];
        const cb = canBoMap.get(String(line.can_bo_id).trim());
        if (!tapHuanCanBoProfileComplete(cb)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: txt('matTranTapHuan.validation.canBoProfileIncomplete'),
            path: ['chi_tiet', i, 'can_bo_id'],
          });
        }
      }
    })
    .superRefine((data, ctx) => {
      if (data.cap_tap_huan !== 'Cấp xã' || data.don_vi_id.trim() === '') return;
      if (canBoMap.size === 0) return;
      const lopDv = data.don_vi_id.trim();
      for (let i = 0; i < data.chi_tiet.length; i++) {
        const line = data.chi_tiet[i];
        const cb = canBoMap.get(String(line.can_bo_id).trim());
        if (!cb) continue;
        const cbDv = String(cb.don_vi_id ?? '').trim();
        if (cbDv !== lopDv) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: txt('matTranTapHuan.validation.canBoDonViMismatch'),
            path: ['chi_tiet', i, 'can_bo_id'],
          });
        }
      }
    });
}

export type MttqTapHuanFormValues = z.infer<typeof mttqTapHuanObject>;
