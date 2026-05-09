import { z } from 'zod';
import { txt } from '@/lib/text';
import type { MttqUyVienUyBan } from './types';

const optionalText = z
  .string()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

function nullIfEmptyTrimmed(s: string | undefined | null): string | null {
  if (s === undefined || s === null) return null;
  const t = s.trim();
  return t === '' ? null : t;
}

export const mttqUyVienUyBanSchema = z
  .object({
    can_bo_id: z.union([z.string(), z.number()]).refine((v) => String(v).trim() !== '', {
      message: txt('matTranUyVienUyBan.validation.canBoRequired'),
    }),
    ma_uv: optionalText,
    nhiem_ky_id: z.union([z.string(), z.number()]).refine((v) => String(v).trim() !== '', {
      message: txt('matTranUyVienUyBan.validation.nhiemKyRequired'),
    }),
    don_vi_id: z.union([z.string(), z.number(), z.literal('')]).optional(),
    trang_thai_tham_gia: optionalText,
    ghi_chu: optionalText,
  })
  .transform((d) => {
    const dv = d.don_vi_id;
    const donViStr =
      dv === undefined || dv === null || dv === '' ? null : String(dv).trim() === '' ? null : String(dv).trim();
    return {
      can_bo_id: String(d.can_bo_id).trim(),
      ma_uv: nullIfEmptyTrimmed(d.ma_uv),
      nhiem_ky_id: String(d.nhiem_ky_id).trim(),
      don_vi_id: donViStr,
      trang_thai_tham_gia: nullIfEmptyTrimmed(d.trang_thai_tham_gia),
      ghi_chu: nullIfEmptyTrimmed(d.ghi_chu),
    };
  });

export type MttqUyVienUyBanFormInput = z.input<typeof mttqUyVienUyBanSchema>;
export type MttqUyVienUyBanFormValues = z.output<typeof mttqUyVienUyBanSchema>;

export function mttqUyVienUyBanToFormInput(d: MttqUyVienUyBan | null): MttqUyVienUyBanFormInput {
  if (!d) {
    return {
      can_bo_id: '',
      ma_uv: undefined,
      nhiem_ky_id: '',
      don_vi_id: '',
      trang_thai_tham_gia: undefined,
      ghi_chu: undefined,
    };
  }
  return {
    can_bo_id: d.can_bo_id,
    ma_uv: d.ma_uv ?? undefined,
    nhiem_ky_id: d.nhiem_ky_id,
    don_vi_id: d.don_vi_id ?? '',
    trang_thai_tham_gia: d.trang_thai_tham_gia ?? undefined,
    ghi_chu: d.ghi_chu ?? undefined,
  };
}
