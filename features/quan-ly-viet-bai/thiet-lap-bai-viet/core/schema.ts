import { z } from 'zod';
import { txt } from '@/lib/text';

const donGiaField = z
  .union([z.string(), z.number()])
  .transform((v) => {
    if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, v);
    const n = parseFloat(String(v).replace(/\s/g, '').replace(/,/g, ''));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  });

export const theLoaiSchema = z.object({
  ten_the_loai: z.string().trim().min(1, txt('articleSettings.validation.tenTheLoaiRequired')),
  mo_ta: z.string().nullable().optional(),
  don_gia: donGiaField,
});

export type TheLoaiFormValues = z.infer<typeof theLoaiSchema>;

export const thietLapKhacSchema = z.object({
  loai: z.enum(['trang_dang', 'nguon_dang']),
  ten: z.string().trim().min(1, txt('articleSettings.validation.tenRequired')),
  mo_ta: z.string().nullable().optional(),
  thu_tu: z.coerce.number().int().min(0),
});

export type ThietLapKhacFormValues = z.infer<typeof thietLapKhacSchema>;
