import { z } from 'zod';
import { txt } from '@/lib/text';
import {
  CAP_THUC_HIEN_VALUES,
  LOAI_HINH_VALUES,
  TINH_TRANG_DEFAULT,
  TINH_TRANG_VALUES,
} from './constants';
import type { ThucHienPhanBien } from './types';
import { computePhanTramHoanThanh } from './compute-phan-tram';

const optionalLink = z.preprocess(
  (val) => (val == null ? '' : val),
  z
    .string()
    .trim()
    .pipe(
      z
        .union([z.literal(''), z.string().url(txt('pbxhThucHien.validation.linkUrl'))])
        .transform((s) => (s === '' ? undefined : s)),
    ),
);

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' ? undefined : s));

const optionalFk = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' ? undefined : s));

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' ? undefined : s));

export const thucHienPhanBienSchema = z.object({
  cap_thuc_hien: z.enum(CAP_THUC_HIEN_VALUES, {
    message: txt('pbxhThucHien.validation.capThucHienInvalid'),
  }),
  loai_hinh: z.enum(LOAI_HINH_VALUES, {
    message: txt('pbxhThucHien.validation.loaiHinhInvalid'),
  }),
  noi_dung: z.string().trim().min(1, txt('pbxhThucHien.validation.noiDungRequired')),
  doi_tuong_id: optionalFk,
  hinh_thuc_id: optionalFk,
  ngay_bat_dau: optionalDate,
  ngay_ket_thuc: optionalDate,
  mo_ta_thoi_gian: optionalText,
  tinh_trang: z.enum(TINH_TRANG_VALUES, {
    message: txt('pbxhThucHien.validation.tinhTrangInvalid'),
  }),
  don_vi_chu_tri_id: optionalFk,
  phong_ban_tham_muu_id: optionalFk,
  don_vi_thuc_hien_id: optionalFk,
  ket_qua_kien_nghi: optionalText,
  so_lan_hoan_thanh: z.coerce.number().int().min(0),
  so_lan_khao_sat: z.coerce.number().int().min(0),
  link_ket_qua: optionalLink,
}).superRefine((data, ctx) => {
  if (data.so_lan_khao_sat > 0 && data.so_lan_hoan_thanh > data.so_lan_khao_sat) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: txt('pbxhThucHien.validation.soLanHoanThanhMax'),
      path: ['so_lan_hoan_thanh'],
    });
  }
});

export type ThucHienPhanBienFormValues = z.infer<typeof thucHienPhanBienSchema>;

export function phanTramFromFormValues(data: Pick<ThucHienPhanBienFormValues, 'so_lan_hoan_thanh' | 'so_lan_khao_sat'>): number {
  return computePhanTramHoanThanh(data.so_lan_hoan_thanh, data.so_lan_khao_sat);
}

export type ThucHienPhanBienFormInput = {
  cap_thuc_hien: string;
  loai_hinh: string;
  noi_dung: string;
  doi_tuong_id?: string;
  hinh_thuc_id?: string;
  ngay_bat_dau?: string;
  ngay_ket_thuc?: string;
  mo_ta_thoi_gian?: string;
  tinh_trang: string;
  don_vi_chu_tri_id?: string;
  phong_ban_tham_muu_id?: string;
  don_vi_thuc_hien_id?: string;
  ket_qua_kien_nghi?: string;
  so_lan_hoan_thanh: number;
  so_lan_khao_sat: number;
  link_ket_qua?: string;
};

export function thucHienPhanBienToFormInput(row: ThucHienPhanBien | null): ThucHienPhanBienFormInput {
  if (!row) {
    return {
      cap_thuc_hien: 'Cấp tỉnh',
      loai_hinh: 'Giám sát',
      noi_dung: '',
      doi_tuong_id: '',
      hinh_thuc_id: '',
      ngay_bat_dau: '',
      ngay_ket_thuc: '',
      mo_ta_thoi_gian: '',
      tinh_trang: TINH_TRANG_DEFAULT,
      don_vi_chu_tri_id: '',
      phong_ban_tham_muu_id: '',
      don_vi_thuc_hien_id: '',
      ket_qua_kien_nghi: '',
      so_lan_hoan_thanh: 0,
      so_lan_khao_sat: 0,
      link_ket_qua: '',
    };
  }
  return {
    cap_thuc_hien: row.cap_thuc_hien ?? 'Cấp tỉnh',
    loai_hinh: row.loai_hinh ?? 'Giám sát',
    noi_dung: row.noi_dung ?? '',
    doi_tuong_id: row.doi_tuong_id ?? '',
    hinh_thuc_id: row.hinh_thuc_id ?? '',
    ngay_bat_dau: row.ngay_bat_dau ?? '',
    ngay_ket_thuc: row.ngay_ket_thuc ?? '',
    mo_ta_thoi_gian: row.mo_ta_thoi_gian ?? '',
    tinh_trang: row.tinh_trang ?? TINH_TRANG_DEFAULT,
    don_vi_chu_tri_id: row.don_vi_chu_tri_id ?? '',
    phong_ban_tham_muu_id: row.phong_ban_tham_muu_id ?? '',
    don_vi_thuc_hien_id: row.don_vi_thuc_hien_id ?? '',
    ket_qua_kien_nghi: row.ket_qua_kien_nghi ?? '',
    so_lan_hoan_thanh: row.so_lan_hoan_thanh ?? 0,
    so_lan_khao_sat: row.so_lan_khao_sat ?? 0,
    link_ket_qua: row.link_ket_qua ?? '',
  };
}
