import { z } from 'zod';
import { txt } from '@/lib/text';
import {
  CAP_THUC_HIEN_VALUES,
  LOAI_HINH_VALUES,
  TINH_TRANG_DEFAULT,
  TINH_TRANG_VALUES,
} from './constants';
import type { ThucHienPhanBien } from './types';

const optionalLink = z
  .string()
  .trim()
  .transform((s) => s)
  .pipe(
    z
      .union([z.literal(''), z.string().url(txt('pbxhThucHien.validation.linkUrl'))])
      .transform((s) => (s === '' ? undefined : s)),
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
  phan_tram_hoan_thanh: z.coerce.number().int().min(0).max(100),
  link_ket_qua: optionalLink,
});

export type ThucHienPhanBienFormValues = z.infer<typeof thucHienPhanBienSchema>;

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
  phan_tram_hoan_thanh: number;
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
      phan_tram_hoan_thanh: 0,
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
    phan_tram_hoan_thanh: row.phan_tram_hoan_thanh ?? 0,
    link_ket_qua: row.link_ket_qua ?? '',
  };
}
