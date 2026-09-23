import { z } from 'zod';
import { txt } from '@/lib/text';
import {
  HNGH_DOI_TUONG_VALUES,
  HNGH_TON_GIAO_DEFAULT,
  HNGH_TON_GIAO_VALUES,
  HNGH_TRANG_THAI_DEFAULT,
  HNGH_TRANG_THAI_VALUES,
} from './constants';
import type { HoNgheo } from './types';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

const optionalFk = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

/* ------------------------------------------------------------------ *
 * Hộ
 * ------------------------------------------------------------------ */

export const hoNgheoSchema = z.object({
  ho_ten_dai_dien: z.string().trim().min(1, txt('hoNgheo.validation.hoTenRequired')),
  so_cccd: optionalText,
  xa_phuong_id: optionalFk,
  khoi_xom: optionalText,
  doi_tuong: z
    .enum(HNGH_DOI_TUONG_VALUES, { message: txt('hoNgheo.validation.doiTuongInvalid') })
    .optional()
    .or(z.literal('').transform(() => undefined)),
  dien_thoai: optionalText,
  dan_toc_id: optionalFk,
  ton_giao: z.enum(HNGH_TON_GIAO_VALUES, { message: txt('hoNgheo.validation.tonGiaoInvalid') }),
  so_tai_khoan: optionalText,
  ngan_hang: optionalText,
  trang_thai: z.enum(HNGH_TRANG_THAI_VALUES, {
    message: txt('hoNgheo.validation.trangThaiInvalid'),
  }),
  ghi_chu: optionalText,
});

export type HoNgheoFormValues = z.infer<typeof hoNgheoSchema>;

export const hoNgheoStatusChangeSchema = z.object({
  trang_thai: z.enum(HNGH_TRANG_THAI_VALUES, {
    message: txt('hoNgheo.validation.trangThaiInvalid'),
  }),
  ghi_chu: optionalText,
});

export type HoNgheoStatusChangeValues = z.infer<typeof hoNgheoStatusChangeSchema>;

export type HoNgheoStatusChangeInput = { trang_thai: string; ghi_chu?: string };

/**
 * Hình dạng ô nhập (mọi trường là chuỗi thô của form).
 * Cố ý KHÔNG có `ngay_cap_nhat_trang_thai`: trigger DB gán khi trạng thái đổi.
 */
export type HoNgheoFormInput = {
  ho_ten_dai_dien: string;
  so_cccd?: string;
  xa_phuong_id?: string;
  khoi_xom?: string;
  doi_tuong?: string;
  dien_thoai?: string;
  dan_toc_id?: string;
  ton_giao: string;
  so_tai_khoan?: string;
  ngan_hang?: string;
  trang_thai: string;
  ghi_chu?: string;
};

export function hoNgheoToFormInput(row: HoNgheo | null): HoNgheoFormInput {
  if (!row) {
    return {
      ho_ten_dai_dien: '',
      so_cccd: '',
      xa_phuong_id: '',
      khoi_xom: '',
      doi_tuong: '',
      dien_thoai: '',
      dan_toc_id: '',
      ton_giao: HNGH_TON_GIAO_DEFAULT,
      so_tai_khoan: '',
      ngan_hang: '',
      trang_thai: HNGH_TRANG_THAI_DEFAULT,
      ghi_chu: '',
    };
  }
  return {
    ho_ten_dai_dien: row.ho_ten_dai_dien ?? '',
    so_cccd: row.so_cccd ?? '',
    xa_phuong_id: row.xa_phuong_id ?? '',
    khoi_xom: row.khoi_xom ?? '',
    doi_tuong: row.doi_tuong ?? '',
    dien_thoai: row.dien_thoai ?? '',
    dan_toc_id: row.dan_toc_id ?? '',
    ton_giao: row.ton_giao ?? HNGH_TON_GIAO_DEFAULT,
    so_tai_khoan: row.so_tai_khoan ?? '',
    ngan_hang: row.ngan_hang ?? '',
    trang_thai: row.trang_thai ?? HNGH_TRANG_THAI_DEFAULT,
    ghi_chu: row.ghi_chu ?? '',
  };
}
