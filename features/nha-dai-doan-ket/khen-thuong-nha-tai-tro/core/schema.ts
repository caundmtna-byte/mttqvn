import { z } from 'zod';
import { txt } from '@/lib/text';
import { parseSoInput } from '@/lib/number';
import {
  KTNT_CAP_KHEN_DEFAULT,
  KTNT_CAP_KHEN_VALUES,
  KTNT_CAP_KHEN_XA,
  KTNT_NAM_MAX,
  KTNT_NAM_MIN,
  KTNT_TRANG_THAI_DEFAULT,
  KTNT_TRANG_THAI_VALUES,
} from './constants';
import type { KhenThuongNhaTaiTro } from './types';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

/** Năm thành tích: trống là "không giới hạn đầu đó". */
const optionalNam = z.preprocess(
  (val) => {
    if (val == null || val === '') return undefined;
    const n = typeof val === 'number' ? val : Number(String(val).trim());
    return Number.isFinite(n) ? n : Number.NaN;
  },
  z
    .number({ message: txt('khenThuongNhaTaiTro.validation.namInvalid') })
    .int(txt('khenThuongNhaTaiTro.validation.namInvalid'))
    .min(KTNT_NAM_MIN, txt('khenThuongNhaTaiTro.validation.namInvalid'))
    .max(KTNT_NAM_MAX, txt('khenThuongNhaTaiTro.validation.namInvalid'))
    .optional(),
);

const optionalTien = z.preprocess(
  (val) => {
    if (val == null) return undefined;
    if (typeof val === 'number') return Number.isFinite(val) ? val : undefined;
    const s = String(val).trim();
    if (s === '') return undefined;
    return parseSoInput(s) ?? Number.NaN;
  },
  z
    .number({ message: txt('khenThuongNhaTaiTro.validation.tienInvalid') })
    .min(0, txt('khenThuongNhaTaiTro.validation.tienMin'))
    .optional(),
);

export const khenThuongNhaTaiTroSchema = z
  .object({
    noi_dung_khen: z.string().trim().min(1, txt('khenThuongNhaTaiTro.validation.noiDungRequired')),
    ngay_khen: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, txt('khenThuongNhaTaiTro.validation.ngayKhenRequired')),
    so_quyet_dinh: optionalText,
    cap_khen: z.enum(KTNT_CAP_KHEN_VALUES, {
      message: txt('khenThuongNhaTaiTro.validation.capKhenInvalid'),
    }),
    don_vi_khen: optionalText,
    xa_phuong_id: optionalText,
    nha_tai_tro_id: z.string().trim().min(1, txt('khenThuongNhaTaiTro.validation.nhaTaiTroRequired')),
    nam_thanh_tich_tu: optionalNam,
    nam_thanh_tich_den: optionalNam,
    gia_tri_dong_gop_khac: optionalTien,
    trang_thai: z.enum(KTNT_TRANG_THAI_VALUES, {
      message: txt('khenThuongNhaTaiTro.validation.trangThaiInvalid'),
    }),
    ghi_chu: optionalText,
  })
  // Khớp CHECK `ktnt_xa_phuong_theo_cap_chk`: cấp xã bắt buộc có xã.
  .refine((v) => v.cap_khen !== KTNT_CAP_KHEN_XA || Boolean(v.xa_phuong_id), {
    path: ['xa_phuong_id'],
    message: txt('khenThuongNhaTaiTro.validation.xaPhuongRequired'),
  })
  // Khớp CHECK `ktnt_ky_thanh_tich_chk`.
  .refine(
    (v) =>
      v.nam_thanh_tich_tu == null ||
      v.nam_thanh_tich_den == null ||
      v.nam_thanh_tich_tu <= v.nam_thanh_tich_den,
    { path: ['nam_thanh_tich_den'], message: txt('khenThuongNhaTaiTro.validation.kyInvalid') },
  )
  // Cấp khác cấp xã thì gỡ xã (CHECK cấm gắn xã) — ô xã có thể còn giá trị cũ
  // nếu người dùng đổi cấp sau khi đã chọn xã.
  .transform((v) => (v.cap_khen === KTNT_CAP_KHEN_XA ? v : { ...v, xa_phuong_id: undefined }));

export type KhenThuongNhaTaiTroFormValues = z.infer<typeof khenThuongNhaTaiTroSchema>;

export const khenThuongNhaTaiTroStatusChangeSchema = z.object({
  trang_thai: z.enum(KTNT_TRANG_THAI_VALUES, {
    message: txt('khenThuongNhaTaiTro.validation.trangThaiInvalid'),
  }),
  ghi_chu: optionalText,
});

export type KhenThuongNhaTaiTroStatusChangeValues = z.infer<
  typeof khenThuongNhaTaiTroStatusChangeSchema
>;

/** Cố ý KHÔNG có ngày trạng thái / người duyệt — máy chủ gán. */
export type KhenThuongNhaTaiTroFormInput = {
  noi_dung_khen: string;
  ngay_khen: string;
  so_quyet_dinh?: string;
  cap_khen: string;
  don_vi_khen?: string;
  xa_phuong_id?: string;
  nha_tai_tro_id: string;
  nam_thanh_tich_tu?: string;
  nam_thanh_tich_den?: string;
  gia_tri_dong_gop_khac?: string;
  trang_thai: string;
  ghi_chu?: string;
};

const numToStr = (n: number | null | undefined) => (n == null ? '' : String(n));

export function khenThuongNhaTaiTroToFormInput(
  row: KhenThuongNhaTaiTro | null,
  today: string,
): KhenThuongNhaTaiTroFormInput {
  if (!row) {
    return {
      noi_dung_khen: '',
      ngay_khen: today,
      so_quyet_dinh: '',
      cap_khen: KTNT_CAP_KHEN_DEFAULT,
      don_vi_khen: '',
      xa_phuong_id: '',
      nha_tai_tro_id: '',
      nam_thanh_tich_tu: '',
      nam_thanh_tich_den: '',
      gia_tri_dong_gop_khac: '',
      trang_thai: KTNT_TRANG_THAI_DEFAULT,
      ghi_chu: '',
    };
  }
  return {
    noi_dung_khen: row.noi_dung_khen ?? '',
    ngay_khen: row.ngay_khen ?? today,
    so_quyet_dinh: row.so_quyet_dinh ?? '',
    cap_khen: row.cap_khen ?? KTNT_CAP_KHEN_DEFAULT,
    don_vi_khen: row.don_vi_khen ?? '',
    xa_phuong_id: row.xa_phuong_id ?? '',
    nha_tai_tro_id: row.nha_tai_tro_id ?? '',
    nam_thanh_tich_tu: numToStr(row.nam_thanh_tich_tu),
    nam_thanh_tich_den: numToStr(row.nam_thanh_tich_den),
    gia_tri_dong_gop_khac: numToStr(row.gia_tri_dong_gop_khac),
    trang_thai: row.trang_thai ?? KTNT_TRANG_THAI_DEFAULT,
    ghi_chu: row.ghi_chu ?? '',
  };
}
