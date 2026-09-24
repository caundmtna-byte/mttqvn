import { z } from 'zod';
import { txt } from '@/lib/text';
import {
  NDDK_DOI_TUONG_VALUES,
  NDDK_LOAI_HINH_DEFAULT,
  NDDK_LOAI_HINH_VALUES,
  NDDK_NAM_MAX,
  NDDK_NAM_MIN,
  NDDK_NGUON_DEFAULT,
  NDDK_NGUON_HO_TRO_DEFAULT,
  NDDK_NGUON_HO_TRO_VALUES,
  NDDK_NGUON_VALUES,
  NDDK_TRANG_THAI_DEFAULT,
  NDDK_TRANG_THAI_VALUES,
} from './constants';
import type { NhaDaiDoanKet } from './types';
import { parseSoInput } from '@/lib/number';

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

/**
 * Số tiền: để trống là hợp lệ (hồ sơ đang khảo sát thì chưa chốt mức hỗ trợ).
 * Có nhập thì phải là số không âm — khớp `CHECK (so_tien >= 0)` ở DB.
 */
const optionalSoTien = z.preprocess(
  (val) => {
    if (val == null) return undefined;
    if (typeof val === 'number') return Number.isFinite(val) ? val : undefined;
    const s = String(val).trim();
    if (s === '') return undefined;
    // `Number('500.000.000')` là NaN — cán bộ dán số từ Excel sẽ bị từ chối
    // trên một chuỗi trông hoàn toàn bình thường.
    const n = parseSoInput(s);
    return n ?? Number.NaN;
  },
  z
    .number({ message: txt('nhaDaiDoanKet.validation.soTienInvalid') })
    .min(0, txt('nhaDaiDoanKet.validation.soTienMin'))
    .optional(),
);

export const nhaDaiDoanKetSchema = z.object({
  noi_dung_ho_tro: z.string().trim().min(1, txt('nhaDaiDoanKet.validation.noiDungRequired')),
  nam: z.coerce
    .number({ message: txt('nhaDaiDoanKet.validation.namInvalid') })
    .int(txt('nhaDaiDoanKet.validation.namInvalid'))
    .min(NDDK_NAM_MIN, txt('nhaDaiDoanKet.validation.namInvalid'))
    .max(NDDK_NAM_MAX, txt('nhaDaiDoanKet.validation.namInvalid')),
  nguon: z.enum(NDDK_NGUON_VALUES, { message: txt('nhaDaiDoanKet.validation.nguonInvalid') }),
  nguon_ho_tro: z.enum(NDDK_NGUON_HO_TRO_VALUES, {
    message: txt('nhaDaiDoanKet.validation.nguonHoTroInvalid'),
  }),
  ho_ngheo_id: z.string().trim().min(1, txt('nhaDaiDoanKet.validation.hoNgheoRequired')),
  ho_ten_chu_ho: z.string().trim().min(1, txt('nhaDaiDoanKet.validation.chuHoRequired')),
  xa_phuong_id: optionalFk,
  khoi_xom: optionalText,
  doi_tuong: z
    .union([z.enum(NDDK_DOI_TUONG_VALUES), z.literal('')])
    .optional()
    .transform((s) => (s === '' || s === undefined ? undefined : s)),
  loai_hinh_ho_tro: z.enum(NDDK_LOAI_HINH_VALUES, {
    message: txt('nhaDaiDoanKet.validation.loaiHinhInvalid'),
  }),
  so_tien: optionalSoTien,
  trang_thai: z.enum(NDDK_TRANG_THAI_VALUES, {
    message: txt('nhaDaiDoanKet.validation.trangThaiInvalid'),
  }),
  ghi_chu: optionalText,
});

export type NhaDaiDoanKetFormValues = z.infer<typeof nhaDaiDoanKetSchema>;

/**
 * Hộp thoại "Chuyển trạng thái" — chỉ hai trường, KHÔNG đi qua form sửa đầy đủ.
 *
 * `ghi_chu` ở đây là **lý do của lần đổi này**: trigger
 * `fn_ghi_lich_su_trang_thai` chụp lại nó vào `lich_su_trang_thai`, nên mỗi lần
 * đổi giữ được lý do riêng dù cột `ghi_chu` của bản ghi bị ghi đè sau đó.
 */
export const nhaDaiDoanKetStatusChangeSchema = z.object({
  trang_thai: z.enum(NDDK_TRANG_THAI_VALUES, {
    message: txt('nhaDaiDoanKet.validation.trangThaiInvalid'),
  }),
  ghi_chu: optionalText,
});

export type NhaDaiDoanKetStatusChangeValues = z.infer<typeof nhaDaiDoanKetStatusChangeSchema>;

export type NhaDaiDoanKetStatusChangeInput = {
  trang_thai: string;
  ghi_chu?: string;
};

/**
 * Hình dạng ô nhập (mọi trường là chuỗi / số thô của form).
 * Cố ý KHÔNG có `ngay_cap_nhat_trang_thai`: trigger DB gán khi trạng thái đổi.
 */
export type NhaDaiDoanKetFormInput = {
  noi_dung_ho_tro: string;
  nam: number;
  nguon: string;
  nguon_ho_tro: string;
  ho_ngheo_id: string;
  ho_ten_chu_ho: string;
  xa_phuong_id?: string;
  khoi_xom?: string;
  doi_tuong?: string;
  loai_hinh_ho_tro: string;
  so_tien?: string;
  trang_thai: string;
  ghi_chu?: string;
};

export function nhaDaiDoanKetToFormInput(row: NhaDaiDoanKet | null): NhaDaiDoanKetFormInput {
  if (!row) {
    return {
      noi_dung_ho_tro: '',
      nam: new Date().getFullYear(),
      nguon: NDDK_NGUON_DEFAULT,
      nguon_ho_tro: NDDK_NGUON_HO_TRO_DEFAULT,
      ho_ngheo_id: '',
      ho_ten_chu_ho: '',
      xa_phuong_id: '',
      khoi_xom: '',
      doi_tuong: '',
      loai_hinh_ho_tro: NDDK_LOAI_HINH_DEFAULT,
      so_tien: '',
      trang_thai: NDDK_TRANG_THAI_DEFAULT,
      ghi_chu: '',
    };
  }
  return {
    noi_dung_ho_tro: row.noi_dung_ho_tro ?? '',
    nam: row.nam ?? new Date().getFullYear(),
    nguon: row.nguon ?? NDDK_NGUON_DEFAULT,
    nguon_ho_tro: row.nguon_ho_tro ?? NDDK_NGUON_HO_TRO_DEFAULT,
    ho_ngheo_id: row.ho_ngheo_id ?? '',
    ho_ten_chu_ho: row.ho_ten_chu_ho ?? '',
    xa_phuong_id: row.xa_phuong_id ?? '',
    khoi_xom: row.khoi_xom ?? '',
    doi_tuong: row.doi_tuong ?? '',
    loai_hinh_ho_tro: row.loai_hinh_ho_tro ?? NDDK_LOAI_HINH_DEFAULT,
    so_tien: row.so_tien == null ? '' : String(row.so_tien),
    trang_thai: row.trang_thai ?? NDDK_TRANG_THAI_DEFAULT,
    ghi_chu: row.ghi_chu ?? '',
  };
}
