import { z } from 'zod';
import { txt } from '@/lib/text';
import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';
import { LOAI_HINH_VALUES, TRANG_THAI_HOAT_DONG_DEFAULT } from './constants';
import type { ThongTinToChucQuanTrong } from './types';

const optionalText = z
  .string()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

function nullIfEmptyTrimmed(s: string | undefined | null): string | null {
  if (s === undefined || s === null) return null;
  const t = s.trim();
  return t === '' ? null : t;
}

export const thongTinToChucQuanTrongSchema = z
  .object({
    loai_hinh: z.enum(LOAI_HINH_VALUES, {
      message: txt('danTocToChucQuanTrong.validation.loaiHinhInvalid'),
    }),
    ten_co_so: z.string().trim().min(1, txt('danTocToChucQuanTrong.validation.tenCoSoRequired')),
    chu_tri: optionalText,
    lich_su_hinh_thanh: optionalText,
    cong_tac_an_sinh: optionalText,
    don_vi_id: z.union([z.string(), z.number(), z.literal('')]).optional(),
    dia_chi: optionalText,
    so_dien_thoai: optionalText,
    trang_thai: z.enum(TRANG_THAI_HOAT_DONG, {
      message: txt('danTocToChucQuanTrong.validation.trangThaiInvalid'),
    }),
  })
  .transform((d) => {
    const dv = d.don_vi_id;
    const donViStr =
      dv === undefined || dv === null || dv === '' ? null : String(dv).trim() === '' ? null : String(dv).trim();
    return {
      loai_hinh: d.loai_hinh,
      ten_co_so: d.ten_co_so.trim(),
      chu_tri: nullIfEmptyTrimmed(d.chu_tri),
      lich_su_hinh_thanh: nullIfEmptyTrimmed(d.lich_su_hinh_thanh),
      cong_tac_an_sinh: nullIfEmptyTrimmed(d.cong_tac_an_sinh),
      don_vi_id: donViStr,
      dia_chi: nullIfEmptyTrimmed(d.dia_chi),
      so_dien_thoai: nullIfEmptyTrimmed(d.so_dien_thoai),
      trang_thai: d.trang_thai,
    };
  });

export type ThongTinToChucQuanTrongFormInput = z.input<typeof thongTinToChucQuanTrongSchema>;
export type ThongTinToChucQuanTrongFormValues = z.output<typeof thongTinToChucQuanTrongSchema>;

export function thongTinToChucQuanTrongToFormInput(
  d: ThongTinToChucQuanTrong | null,
): ThongTinToChucQuanTrongFormInput {
  if (!d) {
    return {
      loai_hinh: 'Chùa',
      ten_co_so: '',
      chu_tri: undefined,
      lich_su_hinh_thanh: undefined,
      cong_tac_an_sinh: undefined,
      don_vi_id: '',
      dia_chi: undefined,
      so_dien_thoai: undefined,
      trang_thai: TRANG_THAI_HOAT_DONG_DEFAULT,
    };
  }
  return {
    loai_hinh: d.loai_hinh as ThongTinToChucQuanTrongFormInput['loai_hinh'],
    ten_co_so: d.ten_co_so,
    chu_tri: d.chu_tri ?? undefined,
    lich_su_hinh_thanh: d.lich_su_hinh_thanh ?? undefined,
    cong_tac_an_sinh: d.cong_tac_an_sinh ?? undefined,
    don_vi_id: d.don_vi_id ?? '',
    dia_chi: d.dia_chi ?? undefined,
    so_dien_thoai: d.so_dien_thoai ?? undefined,
    trang_thai: d.trang_thai,
  };
}
