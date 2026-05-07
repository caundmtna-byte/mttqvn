import { z } from 'zod';
import { txt } from '@/lib/text';
import type { MttqNhiemKy } from './types';

const optionalText = z
  .string()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

function parseOptionalYear(s: unknown): number | null {
  if (s === undefined || s === null) return null;
  const str = typeof s === 'number' ? String(s) : String(s).trim();
  if (str === '') return null;
  const n = Number(str);
  if (!Number.isInteger(n)) return null;
  return n;
}

function yearProvided(raw: unknown): boolean {
  if (raw === undefined || raw === null) return false;
  return String(raw).trim() !== '';
}

export const mttqNhiemKySchema = z
  .object({
    ten_nhiem_ky: z.string().trim().min(1, txt('matTranNhiemKy.validation.tenRequired')),
    tu_nam: z.union([z.string(), z.number()]).optional(),
    den_nam: z.union([z.string(), z.number()]).optional(),
    thong_tin: optionalText,
    ghi_chu: optionalText,
    sl_dau_nhiem_ky: z.coerce.number().int(),
    sl_dang_tham_gia: z.coerce.number().int(),
    sl_thoi_tham_gia: z.coerce.number().int(),
    sl_can_bo_sung: z.coerce.number().int(),
    sl_thieu: z.coerce.number().int(),
  })
  .superRefine((data, ctx) => {
    if (yearProvided(data.tu_nam)) {
      const tu = parseOptionalYear(data.tu_nam);
      if (tu === null || tu < 2000 || tu > 2100) {
        ctx.addIssue({
          code: 'custom',
          path: ['tu_nam'],
          message: txt('matTranNhiemKy.validation.yearRange'),
        });
      }
    }
    if (yearProvided(data.den_nam)) {
      const de = parseOptionalYear(data.den_nam);
      if (de === null || de < 2000 || de > 2100) {
        ctx.addIssue({
          code: 'custom',
          path: ['den_nam'],
          message: txt('matTranNhiemKy.validation.yearRange'),
        });
      }
    }
    const tu = parseOptionalYear(data.tu_nam);
    const de = parseOptionalYear(data.den_nam);
    if (tu != null && de != null && tu > de) {
      ctx.addIssue({
        code: 'custom',
        path: ['den_nam'],
        message: txt('matTranNhiemKy.validation.tuDenNamOrder'),
      });
    }
  })
  .transform((d) => ({
    ten_nhiem_ky: d.ten_nhiem_ky.trim(),
    tu_nam: parseOptionalYear(d.tu_nam),
    den_nam: parseOptionalYear(d.den_nam),
    thong_tin: d.thong_tin != null && d.thong_tin.trim() !== '' ? d.thong_tin.trim() : null,
    ghi_chu: d.ghi_chu != null && d.ghi_chu.trim() !== '' ? d.ghi_chu.trim() : null,
    sl_dau_nhiem_ky: d.sl_dau_nhiem_ky,
    sl_dang_tham_gia: d.sl_dang_tham_gia,
    sl_thoi_tham_gia: d.sl_thoi_tham_gia,
    sl_can_bo_sung: d.sl_can_bo_sung,
    sl_thieu: d.sl_thieu,
  }));

export type MttqNhiemKyFormInput = z.input<typeof mttqNhiemKySchema>;
export type MttqNhiemKyFormValues = z.output<typeof mttqNhiemKySchema>;

export function mttqNhiemKyToFormInput(d: MttqNhiemKy | null): MttqNhiemKyFormInput {
  if (!d) {
    return {
      ten_nhiem_ky: '',
      tu_nam: '',
      den_nam: '',
      thong_tin: undefined,
      ghi_chu: undefined,
      sl_dau_nhiem_ky: 0,
      sl_dang_tham_gia: 0,
      sl_thoi_tham_gia: 0,
      sl_can_bo_sung: 0,
      sl_thieu: 0,
    };
  }
  return {
    ten_nhiem_ky: d.ten_nhiem_ky,
    tu_nam: d.tu_nam != null ? String(d.tu_nam) : '',
    den_nam: d.den_nam != null ? String(d.den_nam) : '',
    thong_tin: d.thong_tin ?? undefined,
    ghi_chu: d.ghi_chu ?? undefined,
    sl_dau_nhiem_ky: d.sl_dau_nhiem_ky,
    sl_dang_tham_gia: d.sl_dang_tham_gia,
    sl_thoi_tham_gia: d.sl_thoi_tham_gia,
    sl_can_bo_sung: d.sl_can_bo_sung,
    sl_thieu: d.sl_thieu,
  };
}
