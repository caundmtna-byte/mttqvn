import { z } from 'zod';
import { txt } from '@/lib/text';

export const luongThietLapNgachSchema = z.object({
  ma: z.string().max(64, txt('matTranThietLapLuong.validation.maMax')),
  ten: z.string().trim().min(1, txt('matTranThietLapLuong.validation.tenRequired')),
  mo_ta: z.string().max(10_000),
  thu_tu: z.coerce.number().int().min(0).max(999_999),
});

export type LuongThietLapNgachFormValues = z.infer<typeof luongThietLapNgachSchema>;

export const luongThietLapCauHinhSchema = z.object({
  muc_luong_co_so: z.coerce.number().positive(txt('matTranThietLapLuong.validation.mlcsPositive')),
});

export type LuongThietLapCauHinhFormValues = z.infer<typeof luongThietLapCauHinhSchema>;

/** Mã bậc cố định theo DB (CHECK constraint). */
export const LUONG_THIET_LAP_BAC_MA_CODES = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'] as const;
export type LuongThietLapBacMaCode = (typeof LUONG_THIET_LAP_BAC_MA_CODES)[number];

export const luongThietLapBacFormSchema = z.object({
  ma_bac: z.enum(LUONG_THIET_LAP_BAC_MA_CODES),
  he_so: z.coerce.number().positive(txt('matTranThietLapLuong.validation.heSoInvalid')),
  thu_tu: z.coerce.number().int().min(0).max(999_999),
});

export type LuongThietLapBacFormValues = z.infer<typeof luongThietLapBacFormSchema>;
