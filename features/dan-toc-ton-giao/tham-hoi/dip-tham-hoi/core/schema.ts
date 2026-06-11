import { z } from 'zod';
import { txt } from '@/lib/text';
import { DON_VI_TINH_VALUE, TRANG_THAI_DEFAULT, TRANG_THAI_VALUES } from './constants';
import type { DipThamHoi } from './types';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' ? undefined : s));

const optionalDate = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (v == null) return undefined;
    const s = String(v).trim();
    return s === '' ? undefined : s;
  });

const donViToChucIdField = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (v == null) return undefined;
    const s = String(v).trim();
    if (s === '' || s === DON_VI_TINH_VALUE) return undefined;
    return s;
  });

const nonNegativeInt = z.coerce
  .number()
  .int(txt('danTocDipThamHoi.validation.soLuongInt'))
  .min(0, txt('danTocDipThamHoi.validation.soLuongMin'));

const optionalId = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (v == null) return undefined;
    const s = String(v).trim();
    return s === '' ? undefined : s;
  });

export const dipThamHoiSchema = z.object({
  ten_dip: z.string().trim().min(1, txt('danTocDipThamHoi.validation.tenDipRequired')),
  mo_ta: optionalText,
  thoi_gian_du_kien: optionalText,
  thoi_gian_thuc_te: optionalDate,
  don_vi_to_chuc_id: donViToChucIdField,
  phong_ban_tham_muu_id: optionalId,
  so_luong_to_chuc_du_kien: nonNegativeInt,
  so_luong_ca_nhan_du_kien: nonNegativeInt,
  trang_thai: z.enum(TRANG_THAI_VALUES, { message: txt('danTocDipThamHoi.validation.trangThaiInvalid') }),
  ghi_chu: optionalText,
});

export type DipThamHoiFormValues = z.infer<typeof dipThamHoiSchema>;

export type DipThamHoiFormInput = {
  ten_dip: string;
  mo_ta?: string;
  thoi_gian_du_kien?: string;
  thoi_gian_thuc_te?: string;
  don_vi_to_chuc_id?: string;
  phong_ban_tham_muu_id?: string;
  so_luong_to_chuc_du_kien: number | string;
  so_luong_ca_nhan_du_kien: number | string;
  trang_thai: string;
  ghi_chu?: string;
};

export function dipThamHoiToFormInput(row: DipThamHoi | null): DipThamHoiFormInput {
  if (!row) {
    return {
      ten_dip: '',
      mo_ta: '',
      thoi_gian_du_kien: '',
      thoi_gian_thuc_te: '',
      don_vi_to_chuc_id: DON_VI_TINH_VALUE,
      phong_ban_tham_muu_id: '',
      so_luong_to_chuc_du_kien: 0,
      so_luong_ca_nhan_du_kien: 0,
      trang_thai: TRANG_THAI_DEFAULT,
      ghi_chu: '',
    };
  }
  return {
    ten_dip: row.ten_dip ?? '',
    mo_ta: row.mo_ta ?? '',
    thoi_gian_du_kien: row.thoi_gian_du_kien ?? '',
    thoi_gian_thuc_te: row.thoi_gian_thuc_te ?? '',
    don_vi_to_chuc_id:
      row.don_vi_to_chuc_id != null && row.don_vi_to_chuc_id !== ''
        ? row.don_vi_to_chuc_id
        : DON_VI_TINH_VALUE,
    phong_ban_tham_muu_id: row.phong_ban_tham_muu_id ?? '',
    so_luong_to_chuc_du_kien: row.so_luong_to_chuc_du_kien ?? 0,
    so_luong_ca_nhan_du_kien: row.so_luong_ca_nhan_du_kien ?? 0,
    trang_thai: row.trang_thai ?? TRANG_THAI_DEFAULT,
    ghi_chu: row.ghi_chu ?? '',
  };
}
