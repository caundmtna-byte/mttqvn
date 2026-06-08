import { z } from 'zod';
import { txt } from '@/lib/text';
import { TIEN_DO_DEFAULT, TIEN_DO_VALUES } from './constants';
import type { ThamHoiToChuc } from './types';

const optionalLink = z
  .string()
  .trim()
  .transform((s) => s)
  .pipe(
    z
      .union([z.literal(''), z.string().url(txt('danTocThamHoiToChuc.validation.linkUrl'))])
      .transform((s) => (s === '' ? undefined : s)),
  );

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' ? undefined : s));

export const thamHoiToChucSchema = z.object({
  to_chuc_id: z.string().trim().min(1, txt('danTocThamHoiToChuc.validation.toChucRequired')),
  dip_tham_hoi: z.string().trim().min(1, txt('danTocThamHoiToChuc.validation.dipThamHoiRequired')),
  thoi_gian_du_kien: optionalText,
  don_vi_tham_hoi: optionalText,
  noi_dung_tham_hoi: optionalText,
  thanh_phan_doan: optionalText,
  qua_tang: optionalText,
  tien_do: z.enum(TIEN_DO_VALUES, { message: txt('danTocThamHoiToChuc.validation.tienDoInvalid') }),
  ket_qua_thuc_hien: optionalText,
  link_ket_qua: optionalLink,
});

export type ThamHoiToChucFormValues = z.infer<typeof thamHoiToChucSchema>;

export type ThamHoiToChucFormInput = {
  to_chuc_id: string;
  dip_tham_hoi: string;
  thoi_gian_du_kien?: string;
  don_vi_tham_hoi?: string;
  noi_dung_tham_hoi?: string;
  thanh_phan_doan?: string;
  qua_tang?: string;
  tien_do: string;
  ket_qua_thuc_hien?: string;
  link_ket_qua?: string;
};

export function thamHoiToChucToFormInput(row: ThamHoiToChuc | null): ThamHoiToChucFormInput {
  if (!row) {
    return {
      to_chuc_id: '',
      dip_tham_hoi: '',
      thoi_gian_du_kien: '',
      don_vi_tham_hoi: '',
      noi_dung_tham_hoi: '',
      thanh_phan_doan: '',
      qua_tang: '',
      tien_do: TIEN_DO_DEFAULT,
      ket_qua_thuc_hien: '',
      link_ket_qua: '',
    };
  }
  return {
    to_chuc_id: row.to_chuc_id ?? '',
    dip_tham_hoi: row.dip_tham_hoi ?? '',
    thoi_gian_du_kien: row.thoi_gian_du_kien ?? '',
    don_vi_tham_hoi: row.don_vi_tham_hoi ?? '',
    noi_dung_tham_hoi: row.noi_dung_tham_hoi ?? '',
    thanh_phan_doan: row.thanh_phan_doan ?? '',
    qua_tang: row.qua_tang ?? '',
    tien_do: row.tien_do ?? TIEN_DO_DEFAULT,
    ket_qua_thuc_hien: row.ket_qua_thuc_hien ?? '',
    link_ket_qua: row.link_ket_qua ?? '',
  };
}
