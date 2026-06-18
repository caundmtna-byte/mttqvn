import { z } from 'zod';
import { txt } from '@/lib/text';
import {
  DON_VI_THAM_HOI_CQMTTQ_VALUE,
  QUA_TANG_MAX_LENGTH,
  TRANG_THAI_DEFAULT,
  TRANG_THAI_VALUES,
} from './constants';
import type { ThamHoiCaNhan } from './types';
import { dbDateToMonthYear } from '../utils/thoi-gian-du-kien';

const optionalLink = z.preprocess(
  (val) => (val == null ? '' : val),
  z
    .string()
    .trim()
    .pipe(
      z
        .union([z.literal(''), z.string().url(txt('danTocThamHoiCaNhan.validation.linkUrl'))])
        .transform((s) => (s === '' ? undefined : s)),
    ),
);

const optionalText = z.preprocess(
  (val) => (val == null ? '' : val),
  z
    .string()
    .trim()
    .transform((s) => (s === '' ? undefined : s)),
);

const optionalId = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (v == null) return undefined;
    const s = String(v).trim();
    return s === '' ? undefined : s;
  });

const optionalDate = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (v == null) return undefined;
    const s = String(v).trim();
    return s === '' ? undefined : s;
  });

const donViThamHoiIdField = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (v == null) return undefined;
    const s = String(v).trim();
    if (s === '' || s === DON_VI_THAM_HOI_CQMTTQ_VALUE) return undefined;
    return s;
  });

const thoiGianDuKienField = z
  .union([z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (v == null) return undefined;
    const s = String(v).trim();
    return s === '' ? undefined : s;
  })
  .pipe(
    z.union([
      z.undefined(),
      z.string().regex(/^\d{4}-\d{2}$/, txt('danTocThamHoiCaNhan.validation.thoiGianDuKienInvalid')),
    ]),
  );

const quaTangField = optionalText.pipe(
  z
    .union([
      z.undefined(),
      z.string().max(QUA_TANG_MAX_LENGTH, txt('danTocThamHoiCaNhan.validation.quaTangMaxLength')),
    ])
    .optional(),
);

export const thamHoiCaNhanSchema = z.object({
  ca_nhan_id: z.string().trim().min(1, txt('danTocThamHoiCaNhan.validation.caNhanRequired')),
  phong_ban_tham_muu_id: optionalId,
  dip_tham_hoi_id: z.string().trim().min(1, txt('danTocThamHoiCaNhan.validation.dipThamHoiRequired')),
  thoi_gian_du_kien: thoiGianDuKienField,
  thoi_gian_thuc_te: optionalDate,
  don_vi_tham_hoi_id: donViThamHoiIdField,
  qua_tang: quaTangField,
  xa_phuong_id: optionalId,
  trang_thai: z.enum(TRANG_THAI_VALUES, { message: txt('danTocThamHoiCaNhan.validation.trangThaiInvalid') }),
  ket_qua_ghi_chu: optionalText,
  link_ket_qua: optionalLink,
});

export type ThamHoiCaNhanFormValues = z.infer<typeof thamHoiCaNhanSchema>;

export type ThamHoiCaNhanFormInput = {
  ca_nhan_id: string;
  phong_ban_tham_muu_id?: string;
  dip_tham_hoi_id: string;
  thoi_gian_du_kien?: string;
  thoi_gian_thuc_te?: string;
  don_vi_tham_hoi_id?: string;
  qua_tang?: string;
  xa_phuong_id?: string;
  trang_thai: string;
  ket_qua_ghi_chu?: string;
  link_ket_qua?: string;
};

export function thamHoiCaNhanToFormInput(row: ThamHoiCaNhan | null): ThamHoiCaNhanFormInput {
  if (!row) {
    return {
      ca_nhan_id: '',
      phong_ban_tham_muu_id: '',
      dip_tham_hoi_id: '',
      thoi_gian_du_kien: '',
      thoi_gian_thuc_te: '',
      don_vi_tham_hoi_id: DON_VI_THAM_HOI_CQMTTQ_VALUE,
      qua_tang: '',
      xa_phuong_id: '',
      trang_thai: TRANG_THAI_DEFAULT,
      ket_qua_ghi_chu: '',
      link_ket_qua: '',
    };
  }
  return {
    ca_nhan_id: row.ca_nhan_id ?? '',
    phong_ban_tham_muu_id: row.phong_ban_tham_muu_id ?? '',
    dip_tham_hoi_id: row.dip_tham_hoi_id ?? '',
    thoi_gian_du_kien: dbDateToMonthYear(row.thoi_gian_du_kien),
    thoi_gian_thuc_te: row.thoi_gian_thuc_te ?? '',
    don_vi_tham_hoi_id:
      row.don_vi_tham_hoi_id != null && row.don_vi_tham_hoi_id !== ''
        ? row.don_vi_tham_hoi_id
        : DON_VI_THAM_HOI_CQMTTQ_VALUE,
    qua_tang: row.qua_tang ?? '',
    xa_phuong_id: row.xa_phuong_id ?? '',
    trang_thai: row.trang_thai ?? TRANG_THAI_DEFAULT,
    ket_qua_ghi_chu: row.ket_qua_ghi_chu ?? '',
    link_ket_qua: row.link_ket_qua ?? '',
  };
}
