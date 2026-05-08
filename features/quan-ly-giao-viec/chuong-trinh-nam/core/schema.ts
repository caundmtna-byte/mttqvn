import { z } from 'zod';
import { txt } from '@/lib/text';
import { CHUONG_TRINH_NAM_TRANG_THAI } from './constants';
import type { ChuongTrinhNam } from './types';

const dateRequired = z
  .string()
  .trim()
  .min(1, txt('chuongTrinhNam.validation.dateRequired'));

export const chuongTrinhNamSchema = z
  .object({
    ten_chuong_trinh: z
      .string()
      .trim()
      .min(1, txt('chuongTrinhNam.validation.tenRequired'))
      .max(500, txt('chuongTrinhNam.validation.tenMax')),
    mo_ta: z
      .string()
      .trim()
      .optional()
      .transform((s) => (s === '' ? undefined : s)),
    ghi_chu: z
      .string()
      .trim()
      .optional()
      .transform((s) => (s === '' ? undefined : s)),
    ngay_bat_dau: dateRequired,
    ngay_ket_thuc: dateRequired,
    trang_thai: z.enum(CHUONG_TRINH_NAM_TRANG_THAI, {
      message: txt('chuongTrinhNam.validation.trangThaiRequired'),
    }),
    id_phong_ban: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((v) => {
        if (v == null) return null;
        const s = String(v).trim();
        return s === '' ? null : s;
      }),
  })
  .refine(
    (d) => {
      const a = d.ngay_bat_dau.slice(0, 10);
      const b = d.ngay_ket_thuc.slice(0, 10);
      return a <= b;
    },
    { message: txt('chuongTrinhNam.validation.dateOrder'), path: ['ngay_ket_thuc'] },
  );

export type ChuongTrinhNamFormValues = z.infer<typeof chuongTrinhNamSchema>;

export function chuongTrinhNamRowToFormValues(row: ChuongTrinhNam): ChuongTrinhNamFormValues {
  return {
    ten_chuong_trinh: row.ten_chuong_trinh,
    mo_ta: row.mo_ta ?? undefined,
    ghi_chu: row.ghi_chu ?? undefined,
    ngay_bat_dau: row.ngay_bat_dau.slice(0, 10),
    ngay_ket_thuc: row.ngay_ket_thuc.slice(0, 10),
    trang_thai: row.trang_thai,
    id_phong_ban: row.id_phong_ban ?? null,
  };
}
