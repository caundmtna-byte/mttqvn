import { z } from 'zod';
import { txt } from '@/lib/text';
import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';
import { DOI_TUONG_VALUES, TRANG_THAI_HOAT_DONG_DEFAULT } from './constants';
import type { ThongTinCaNhanTieuBieu } from './types';

const optionalText = z
  .string()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

function nullIfEmptyTrimmed(s: string | undefined | null): string | null {
  if (s === undefined || s === null) return null;
  const t = s.trim();
  return t === '' ? null : t;
}

export const thongTinCaNhanTieuBieuSchema = z
  .object({
    ho_va_ten: z.string().trim().min(1, txt('danTocCaNhanTieuBieu.validation.hoVaTenRequired')),
    ngay_sinh: optionalText,
    doi_tuong: z.enum(DOI_TUONG_VALUES, {
      message: txt('danTocCaNhanTieuBieu.validation.doiTuongInvalid'),
    }),
    chuc_vu_vi_tri: optionalText,
    ton_giao_dan_toc: optionalText,
    dia_chi: optionalText,
    don_vi_id: z.union([z.string(), z.number(), z.literal('')]).optional(),
    so_dien_thoai: optionalText,
    dong_gop_noi_bat: optionalText,
    trang_thai: z.enum(TRANG_THAI_HOAT_DONG, {
      message: txt('danTocCaNhanTieuBieu.validation.trangThaiInvalid'),
    }),
  })
  .transform((d) => {
    const dv = d.don_vi_id;
    const donViStr =
      dv === undefined || dv === null || dv === '' ? null : String(dv).trim() === '' ? null : String(dv).trim();
    const ns = nullIfEmptyTrimmed(d.ngay_sinh);
    return {
      ho_va_ten: d.ho_va_ten.trim(),
      ngay_sinh: ns,
      doi_tuong: d.doi_tuong,
      chuc_vu_vi_tri: nullIfEmptyTrimmed(d.chuc_vu_vi_tri),
      ton_giao_dan_toc: nullIfEmptyTrimmed(d.ton_giao_dan_toc),
      dia_chi: nullIfEmptyTrimmed(d.dia_chi),
      don_vi_id: donViStr,
      so_dien_thoai: nullIfEmptyTrimmed(d.so_dien_thoai),
      dong_gop_noi_bat: nullIfEmptyTrimmed(d.dong_gop_noi_bat),
      trang_thai: d.trang_thai,
    };
  });

export type ThongTinCaNhanTieuBieuFormInput = z.input<typeof thongTinCaNhanTieuBieuSchema>;
export type ThongTinCaNhanTieuBieuFormValues = z.output<typeof thongTinCaNhanTieuBieuSchema>;

export function thongTinCaNhanTieuBieuToFormInput(d: ThongTinCaNhanTieuBieu | null): ThongTinCaNhanTieuBieuFormInput {
  if (!d) {
    return {
      ho_va_ten: '',
      ngay_sinh: undefined,
      doi_tuong: 'Người uy tín',
      chuc_vu_vi_tri: undefined,
      ton_giao_dan_toc: undefined,
      dia_chi: undefined,
      don_vi_id: '',
      so_dien_thoai: undefined,
      dong_gop_noi_bat: undefined,
      trang_thai: TRANG_THAI_HOAT_DONG_DEFAULT,
    };
  }
  return {
    ho_va_ten: d.ho_va_ten,
    ngay_sinh: d.ngay_sinh ?? undefined,
    doi_tuong: d.doi_tuong as ThongTinCaNhanTieuBieuFormInput['doi_tuong'],
    chuc_vu_vi_tri: d.chuc_vu_vi_tri ?? undefined,
    ton_giao_dan_toc: d.ton_giao_dan_toc ?? undefined,
    dia_chi: d.dia_chi ?? undefined,
    don_vi_id: d.don_vi_id ?? '',
    so_dien_thoai: d.so_dien_thoai ?? undefined,
    dong_gop_noi_bat: d.dong_gop_noi_bat ?? undefined,
    trang_thai: d.trang_thai,
  };
}
