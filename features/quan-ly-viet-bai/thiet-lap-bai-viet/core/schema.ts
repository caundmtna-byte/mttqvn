import { z } from 'zod';
import { txt } from '@/lib/text';
import { parseSoInput } from '@/lib/number';

/**
 * Đơn giá thể loại.
 *
 * Bản cũ dùng `parseFloat(s.replace(/,/g,''))` mà KHÔNG bỏ dấu chấm, nên
 * `"500.000.000"` được đọc thành `500` — sai một triệu lần, im lặng, và số sai
 * đó nhân với số bài để tính nhuận bút cho cả tháng.
 */
const donGiaField = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    if (typeof v === 'number') {
      if (Number.isFinite(v)) return Math.max(0, v);
      ctx.addIssue({ code: 'custom', message: txt('articleSettings.validation.donGiaKhongDoc') });
      return z.NEVER;
    }
    if (String(v).trim() === '') return 0;
    const n = parseSoInput(v, { choThapPhan: true });
    if (n == null) {
      ctx.addIssue({ code: 'custom', message: txt('articleSettings.validation.donGiaKhongDoc') });
      return z.NEVER;
    }
    return Math.max(0, n);
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
