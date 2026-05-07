import { z } from 'zod';
import { txt } from '@/lib/text';
import type { MttqKyHop } from './types';

const optionalText = z
  .string()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

function parseOptionalDate(s: unknown): string | null {
  if (s === undefined || s === null) return null;
  const str = typeof s === 'string' ? s.trim() : String(s).trim();
  if (str === '') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

function isValidTaiLieuHopUrl(s: string): boolean {
  const t = s.trim();
  if (t === '') return true;
  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export const mttqKyHopSchema = z
  .object({
    nhiem_ky_id: z.union([z.string(), z.number()]).refine((v) => String(v).trim() !== '', {
      message: txt('matTranKyHop.validation.nhiemKyRequired'),
    }),
    don_vi_id: z.union([z.string(), z.number(), z.literal('')]).optional(),
    ky_thu: z.string().trim().min(1, txt('matTranKyHop.validation.kyThuRequired')),
    ngay_hop: z.union([z.string(), z.literal('')]).optional(),
    noi_dung_ky_hop: optionalText,
    tai_lieu_hop: optionalText,
    ghi_chu: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.tai_lieu_hop != null && data.tai_lieu_hop.trim() !== '' && !isValidTaiLieuHopUrl(data.tai_lieu_hop)) {
      ctx.addIssue({
        code: 'custom',
        path: ['tai_lieu_hop'],
        message: txt('matTranKyHop.validation.taiLieuHopUrl'),
      });
    }
  })
  .transform((d) => {
    const dv = d.don_vi_id;
    const donViStr =
      dv === undefined || dv === null || dv === '' ? null : String(dv).trim() === '' ? null : String(dv).trim();
    return {
      nhiem_ky_id: String(d.nhiem_ky_id).trim(),
      don_vi_id: donViStr,
      ky_thu: d.ky_thu.trim(),
      ngay_hop: parseOptionalDate(d.ngay_hop),
      noi_dung_ky_hop:
        d.noi_dung_ky_hop != null && d.noi_dung_ky_hop.trim() !== '' ? d.noi_dung_ky_hop.trim() : null,
      tai_lieu_hop: d.tai_lieu_hop != null && d.tai_lieu_hop.trim() !== '' ? d.tai_lieu_hop.trim() : null,
      ghi_chu: d.ghi_chu != null && d.ghi_chu.trim() !== '' ? d.ghi_chu.trim() : null,
    };
  });

export type MttqKyHopFormInput = z.input<typeof mttqKyHopSchema>;
export type MttqKyHopFormValues = z.output<typeof mttqKyHopSchema>;

export function mttqKyHopToFormInput(d: MttqKyHop | null): MttqKyHopFormInput {
  if (!d) {
    return {
      nhiem_ky_id: '',
      don_vi_id: '',
      ky_thu: '',
      ngay_hop: '',
      noi_dung_ky_hop: undefined,
      tai_lieu_hop: undefined,
      ghi_chu: undefined,
    };
  }
  return {
    nhiem_ky_id: d.nhiem_ky_id,
    don_vi_id: d.don_vi_id ?? '',
    ky_thu: d.ky_thu,
    ngay_hop: d.ngay_hop ?? '',
    noi_dung_ky_hop: d.noi_dung_ky_hop ?? undefined,
    tai_lieu_hop: d.tai_lieu_hop ?? undefined,
    ghi_chu: d.ghi_chu ?? undefined,
  };
}
